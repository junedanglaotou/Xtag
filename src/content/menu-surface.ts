/**
 * Native popovers are available in Safari 17+. The fixed overlay is attached outside
 * X's containers, so older browsers can use it without clipping or unsupported selectors.
 */
export function createMenuSurface(menu: HTMLElement) {
  let native = typeof menu.showPopover === 'function' && typeof menu.hidePopover === 'function';
  let open = false;
  function fallback() {
    native = false;
    menu.removeAttribute('popover');
    menu.hidden = !open;
  }
  if (!native) fallback();
  return {
    show() {
      if (native) {
        try { menu.showPopover(); open = true; return; }
        catch { fallback(); }
      }
      menu.hidden = false; open = true;
    },
    hide() {
      if (native && open) {
        try { menu.hidePopover(); } catch { /* detached/closed by the browser */ }
      }
      open = false;
      if (!native) menu.hidden = true;
    },
  };
}
