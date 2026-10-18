export const buttonStyles = `
:host{display:inline-flex;vertical-align:middle;margin-inline-start:6px;flex-shrink:0;line-height:normal;color-scheme:light dark}
button{font:500 12px/1.2 system-ui,sans-serif;border:1px solid #80918866;border-radius:5px;background:transparent;color:inherit;min-width:44px;height:26px;padding:2px 6px;cursor:pointer;display:inline-flex;gap:4px;align-items:center;justify-content:center;touch-action:manipulation}
button:hover{background:#80918820}button:focus-visible{outline:2px solid #4b9f70;outline-offset:2px}svg{width:9px;height:9px}
@media(max-width:600px){:host{margin:4px 0 0;display:flex}button{min-width:40px;height:40px;padding:2px;gap:2px;font-size:11px}}
`;
export const overlayStyles = `
:host{all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;color-scheme:light dark}
*{box-sizing:border-box}.menu,.modal,.toast{pointer-events:auto;font:14px/1.5 system-ui,sans-serif;color:#192922;background:#fff;border:1px solid #dfe5dd;box-shadow:0 12px 44px #0003;border-radius:12px}
.menu[hidden]{display:none!important}
.menu{position:fixed;margin:0;padding:6px;width:184px;max-width:calc(100vw - 16px)}
.menu button{display:flex;justify-content:space-between;gap:18px;width:100%;min-height:44px;border:0;border-radius:7px;padding:10px 12px;color:inherit;background:transparent;font:inherit;cursor:pointer;text-align:left}
.menu button:hover,.menu button:focus-visible{background:#80918820;outline:2px solid #4b9f70;outline-offset:-2px}.menu button[aria-checked=true]{background:#4b9f701a;font-weight:700}.menu small{display:block;font-size:10px;color:#738078;padding:5px 12px}.menu span:last-child{opacity:.65}
.modal{position:fixed;margin:0;inset:16px 16px 16px auto;width:min(740px,calc(100vw - 32px));padding:0;overflow:auto;max-height:calc(100dvh - 32px)}
.modal::backdrop{background:#0006}.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:12px 20px;max-width:calc(100vw - 24px)}
@media(prefers-color-scheme:dark){.menu,.modal,.toast{background:#1b2720;color:#e6ede8;border-color:#34443a}}
:host([data-theme=dark]) .menu,:host([data-theme=dark]) .modal,:host([data-theme=dark]) .toast{background:#1b2720;color:#e6ede8;border-color:#34443a}
:host([data-theme=light]) .menu,:host([data-theme=light]) .modal,:host([data-theme=light]) .toast{background:#fff;color:#192922;border-color:#dfe5dd}
:host([data-theme=dark]) .xtag-app{--bg:#121a16;--panel:#1b2720;--ink:#e6ede8;--muted:#a5b5aa;--line:#34443a;--accent:#8bd1a6}
:host([data-theme=light]) .xtag-app{--bg:#f6f7f2;--panel:#fff;--ink:#192922;--muted:#64756c;--line:#dfe5dd;--accent:#276a49}
@media(max-width:600px){.modal{inset:8px;width:calc(100vw - 16px);max-height:calc(100dvh - 16px)}}
`;
