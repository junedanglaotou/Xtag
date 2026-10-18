import { describe, expect, it, vi } from 'vitest';
import { createMenuSurface } from '../../src/content/menu-surface';
function menu() {
  const el = document.createElement('div');
  el.setAttribute('popover', 'manual');
  Object.defineProperty(el, 'showPopover', { value: undefined, writable: true });
  Object.defineProperty(el, 'hidePopover', { value: undefined, writable: true });
  return el;
}
describe('menu compatibility', () => {
  it('uses a hidden fixed overlay without popover APIs or unsupported selectors', () => {
    const el = menu();
    el.matches = () => { throw new Error('unsupported selector'); };
    const surface = createMenuSurface(el);
    expect(el.hidden).toBe(true); expect(el.hasAttribute('popover')).toBe(false);
    surface.show(); expect(el.hidden).toBe(false);
    surface.hide(); expect(el.hidden).toBe(true);
    surface.hide(); surface.show(); expect(el.hidden).toBe(false);
  });
  it('keeps the native top layer when available and only closes an open menu', () => {
    const el = menu(); const show = vi.fn(); const hide = vi.fn();
    el.showPopover = show; el.hidePopover = hide;
    const surface = createMenuSurface(el);
    surface.hide(); expect(hide).not.toHaveBeenCalled();
    surface.show(); surface.hide(); surface.hide();
    expect(show).toHaveBeenCalledOnce(); expect(hide).toHaveBeenCalledOnce();
    expect(el.hasAttribute('popover')).toBe(true);
  });
  it('falls back when a browser exposes the API but cannot open the popover', () => {
    const el = menu(); el.showPopover = () => { throw new DOMException('not supported'); };
    el.hidePopover = vi.fn();
    const surface = createMenuSurface(el);
    surface.show(); expect(el.hidden).toBe(false); expect(el.hasAttribute('popover')).toBe(false);
    surface.hide(); expect(el.hidden).toBe(true);
  });
});
