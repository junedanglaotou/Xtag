import { createRoot, type Root } from 'react-dom/client';
import { History } from '../ui/History';
import appStyles from '../ui/styles.css?inline';
import { TAGS, countsFor, sameAuthor, type Author, type Mark, type Post, type Tag } from '../core/model';
import { request, subscribe } from '../platform/client';
import { ARTICLE, ownedBy, profileHandle, recognizePost } from '../dom/recognize';
import { buttonStyles, overlayStyles } from './styles';

interface Binding { post: Post; host: HTMLElement; button: HTMLButtonElement }
export function startXTag() {
  let records: Mark[] = [];
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let modalRoot: Root | undefined;
  let restoreFocus: HTMLElement | null = null;
  let profile: { handle: string; host: HTMLElement; button: HTMLButtonElement } | undefined;
  const bindings = new Map<HTMLElement, Binding>();
  const overlayHost = document.createElement('xtag-overlay');
  const shadow = overlayHost.attachShadow({ mode: 'open' });
  const style = document.createElement('style'); style.textContent = overlayStyles + appStyles; shadow.append(style);
  document.documentElement.append(overlayHost);
  const menu = document.createElement('div'); menu.className = 'menu'; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', '私人标签'); menu.setAttribute('popover', 'manual'); shadow.append(menu);
  const modal = document.createElement('dialog'); modal.className = 'modal'; modal.setAttribute('aria-label', '标签记录'); shadow.append(modal);
  let active: Binding | undefined;
  function hideMenu(focus = false) {
    if (menu.matches(':popover-open')) menu.hidePopover();
    active?.button.setAttribute('aria-expanded', 'false');
    if (focus && active?.host.isConnected) active.button.focus();
    active = undefined;
  }
  function toast(message: string) {
    shadow.querySelector('.toast')?.remove(); clearTimeout(toastTimer);
    const node = document.createElement('div'); node.className = 'toast'; node.setAttribute('role', 'alert'); node.textContent = message; shadow.append(node);
    toastTimer = setTimeout(() => node.remove(), 6000);
  }
  function refresh() {
    const byId = new Map(records.map(record => [record.postId, record]));
    for (const binding of bindings.values()) {
      const mark = byId.get(binding.post.postId);
      const text = binding.button.querySelector('span')!;
      if (text.textContent !== (mark?.tag ?? '')) text.textContent = mark?.tag ?? '';
      binding.button.setAttribute('aria-label', `私人标签：${mark?.tag ?? '未标记'}，帖子 ${binding.post.postId}`);
    }
    if (profile) {
      const counts = countsFor(records, { authorHandle: profile.handle, authorDisplayName: profile.handle });
      const text = `标签记录 · ${TAGS.map(tag => `${tag} ${counts[tag]}`).join(' · ')}`;
      if (profile.button.textContent !== text) profile.button.textContent = text;
    }
    if (active) renderMenu(active);
  }
  async function load() { try { const r = await request({ type: 'list' }); if (!disposed) { records = r.records; refresh(); } } catch (e) { if (!disposed) toast((e as Error).message); } }
  function renderMenu(binding: Binding) {
    const focused = (shadow.activeElement as HTMLElement | null)?.dataset.tag;
    menu.replaceChildren();
    const counts = countsFor(records, binding.post);
    const selected = records.find(mark => mark.postId === binding.post.postId)?.tag;
    for (const tag of TAGS) {
      const item = document.createElement('button'); item.type = 'button'; item.setAttribute('role', 'menuitemradio'); item.setAttribute('aria-checked', String(selected === tag));
      item.dataset.tag = tag;
      const label = document.createElement('span'); label.textContent = tag;
      const count = document.createElement('span'); count.textContent = `${counts[tag]}次`; item.append(label, count);
      item.onclick = async event => {
        event.stopPropagation();
        // A virtual list may recycle the article between opening and choosing a label.
        const article = binding.host.closest<HTMLElement>(ARTICLE);
        const current = article ? recognizePost(article) : null;
        if (!current || current.postId !== binding.post.postId || !sameAuthor(current, binding.post)) {
          hideMenu(); schedule(); toast('帖子已变化，请重新选择标签'); return;
        }
        const post = { ...current }; hideMenu(true);
        try { const result = await request({ type: 'set', post, tag, toggle: true }); if (!disposed) { records = result.records; refresh(); } }
        catch (e) { if (!disposed) toast((e as Error).message); }
      };
      menu.append(item);
    }
    const note = document.createElement('small'); note.textContent = '私人判断 · 再选同一标签可取消'; menu.append(note);
    if (focused) menu.querySelector<HTMLButtonElement>(`button[data-tag="${focused}"]`)?.focus();
  }
  function placeMenu() {
    if (!active) return;
    const rect = active.button.getBoundingClientRect();
    const width = menu.offsetWidth; const height = menu.offsetHeight;
    menu.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - width - 8))}px`;
    menu.style.top = `${Math.max(8, Math.min(rect.bottom + 6, innerHeight - height - 8))}px`;
  }
  function openMenu(binding: Binding) {
    if (active === binding) { hideMenu(true); return; }
    hideMenu(); active = binding; binding.button.setAttribute('aria-expanded', 'true'); renderMenu(binding);
    menu.showPopover(); placeMenu(); menu.querySelector('button')?.focus();
  }
  function closeModal() {
    if (modal.open) modal.close(); modalRoot?.unmount(); modalRoot = undefined; modal.replaceChildren();
    restoreFocus?.focus(); restoreFocus = null;
  }
  function openHistory(author: Author) {
    hideMenu(); closeModal(); restoreFocus = document.activeElement as HTMLElement;
    modalRoot = createRoot(modal); modalRoot.render(<History author={author} onClose={closeModal} />); modal.showModal();
  }
  const onCancel = (event: Event) => { event.preventDefault(); closeModal(); };
  modal.addEventListener('cancel', onCancel);
  function placeControl(article: HTMLElement, binding: Binding) {
    const name = [...article.querySelectorAll<HTMLElement>('[data-testid="User-Name"]')].find(el => ownedBy(article, el));
    const avatar = [...article.querySelectorAll<HTMLElement>('[data-testid^="UserAvatar-Container-"]')].find(el => ownedBy(article, el));
    const mobile = innerWidth <= 600 ? avatar?.parentElement : undefined;
    const target = mobile && mobile !== article && !mobile.closest('a') ? mobile : name;
    if (target && binding.host.parentElement !== target) target.append(binding.host);
  }
  function scan() {
    timer = undefined;
    if (disposed) return;
    const background = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g)?.map(Number);
    if (background && background.length >= 3 && background[3] !== 0) {
      overlayHost.dataset.theme = (background[0]! * .2126 + background[1]! * .7152 + background[2]! * .0722) < 128 ? 'dark' : 'light';
    }
    for (const [article, binding] of bindings) {
      const current = article.isConnected ? recognizePost(article) : null;
      if (!current || current.postId !== binding.post.postId || !sameAuthor(current, binding.post) || !binding.host.isConnected) {
        if (active === binding) hideMenu(); binding.host.remove(); bindings.delete(article);
      } else { binding.post = current; placeControl(article, binding); }
    }
    for (const article of document.querySelectorAll<HTMLElement>(ARTICLE)) {
      if (bindings.has(article)) continue;
      const post = recognizePost(article); if (!post) continue;
      const name = [...article.querySelectorAll<HTMLElement>('[data-testid="User-Name"]')].find(el => ownedBy(article, el));
      if (!name) continue;
      const host = document.createElement('xtag-control'); host.dataset.postId = post.postId;
      const root = host.attachShadow({ mode: 'open' }); const css = document.createElement('style'); css.textContent = buttonStyles;
      const button = document.createElement('button'); button.type = 'button'; button.setAttribute('aria-haspopup', 'menu'); button.setAttribute('aria-expanded', 'false');
      button.innerHTML = '<span></span><svg aria-hidden="true" viewBox="0 0 10 10"><path d="m2 3 3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
      root.append(css, button);
      const binding: Binding = { post, host, button }; bindings.set(article, binding);
      button.onclick = event => {
        event.preventDefault(); event.stopPropagation();
        const current = recognizePost(article);
        if (!current || current.postId !== binding.post.postId || !sameAuthor(current, binding.post)) { hideMenu(); schedule(); return; }
        binding.post = current; openMenu(binding);
      };
      placeControl(article, binding);
    }
    const handle = profileHandle(location.pathname);
    const anchor = [...document.querySelectorAll<HTMLElement>('[data-testid="UserName"]')].find(el => !el.closest(ARTICLE));
    if (profile && (profile.handle !== handle || !profile.host.isConnected || !anchor || !anchor.contains(profile.host))) { profile.host.remove(); profile = undefined; }
    if (handle && anchor && !profile) {
      const host = document.createElement('xtag-profile'); const root = host.attachShadow({ mode: 'open' });
      const css = document.createElement('style'); css.textContent = buttonStyles + ':host{display:block;margin:10px 0}button{height:auto;min-height:36px;white-space:normal;font-size:12px;padding:8px}';
      const button = document.createElement('button'); button.type = 'button';
      button.onclick = event => { event.preventDefault(); event.stopPropagation(); openHistory({ authorHandle: handle, authorDisplayName: handle }); };
      root.append(css, button); anchor.append(host); profile = { handle, host, button };
    }
    refresh();
  }
  function schedule() { if (!disposed && !timer) timer = setTimeout(scan, 100); }
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['href', 'data-testid', 'style', 'class'] });
  const onPointer = (event: Event) => { if (active && !event.composedPath().includes(overlayHost) && !event.composedPath().includes(active.host)) hideMenu(); };
  const onKey = (event: KeyboardEvent) => {
    if (!active) return;
    if (event.key === 'Escape' || event.key === 'Tab') { hideMenu(event.key === 'Escape'); return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); const items = [...menu.querySelectorAll('button')]; const index = items.indexOf(shadow.activeElement as HTMLButtonElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    }
  };
  const onLayout = () => { hideMenu(); schedule(); };
  document.addEventListener('pointerdown', onPointer, true); document.addEventListener('keydown', onKey, true);
  window.addEventListener('scroll', onLayout, { capture: true, passive: true }); window.addEventListener('resize', onLayout); window.addEventListener('popstate', onLayout);
  const off = subscribe(() => void load());
  scan(); void load();
  return () => {
    disposed = true; observer.disconnect(); off(); clearTimeout(timer); clearTimeout(toastTimer); hideMenu(); closeModal();
    for (const binding of bindings.values()) binding.host.remove(); bindings.clear(); profile?.host.remove(); overlayHost.remove();
    document.removeEventListener('pointerdown', onPointer, true); document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('scroll', onLayout, true); window.removeEventListener('resize', onLayout); window.removeEventListener('popstate', onLayout);
  };
}
