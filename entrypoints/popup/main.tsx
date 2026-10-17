import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from 'wxt/browser';
import { request } from '../../src/platform/client';
import '../../src/ui/styles.css';
function Popup() {
  const [count, setCount] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => { request({ type: 'list' }).then(r => setCount(r.records.length)).catch(e => setError(e.message)); }, []);
  return <div className="xtag-app"><main className="popup"><header className="brand"><div className="logo">x·</div><div><div className="eyebrow">YOUR PRIVATE INDEX</div><h1>XTag</h1></div></header><p className="intro">每一条帖子，都有自己的判断。</p><p className="countline">已保存 <strong>{count}</strong> 条私人标记</p><button className="primary wide" onClick={() => void browser.tabs.create({ url: browser.runtime.getURL('/records.html') })}>打开标签记录 ↗</button><p className="footnote">在 x.com 帖子旁展开空白按钮，选择标签。<br />数据仅保存在本机，建议定期导出 JSON。</p>{error && <p role="alert">{error}</p>}</main></div>;
}
createRoot(document.getElementById('root')!).render(<Popup />);
