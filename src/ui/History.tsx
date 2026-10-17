import { useEffect, useMemo, useRef, useState } from 'react';
import { TAGS, countsFor, filterMarks, type Author, type Mark, type Tag } from '../core/model';
import { request, subscribe } from '../platform/client';

export function History({ author, onClose }: { author?: Author; onClose?: () => void }) {
  const [records, setRecords] = useState<Mark[]>([]);
  const [tag, setTag] = useState('');
  const [search, setSearch] = useState('');
  const [ascending, setAscending] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(50);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let alive = true;
    const load = () => { request({ type: 'list' }).then(r => { if (alive) setRecords(r.records); }).catch(e => { if (alive) setStatus(e.message); }); };
    load(); const off = subscribe(load);
    return () => { alive = false; off(); };
  }, []);
  const counts = useMemo(() => countsFor(records, author), [records, author]);
  const filtered = useMemo(() => filterMarks(records, { author, tag, search, ascending }), [records, author, tag, search, ascending]);
  useEffect(() => setLimit(50), [tag, search, ascending]);
  async function change(mark: Mark, nextTag: Tag | null) {
    setBusy(true);
    try { setRecords((await request({ type: 'set', post: mark, tag: nextTag })).records); setStatus(nextTag ? '标签已更新' : '已取消标记'); }
    catch (e) { setStatus((e as Error).message); } finally { setBusy(false); }
  }
  async function exportBackup() {
    try {
      const { records: fresh } = await request({ type: 'list' });
      const url = URL.createObjectURL(new Blob([JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), records: fresh }, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = `xtag-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000); setStatus(`已导出全部 ${fresh.length} 条记录`);
    } catch (e) { setStatus((e as Error).message); }
  }
  async function importBackup(selected?: File) {
    if (!selected) return;
    setBusy(true);
    try {
      if (selected.size > 20 * 1024 * 1024) throw new Error('备份超过 20 MB，请拆分后导入');
      const backup: unknown = JSON.parse(await selected.text());
      const result = await request({ type: 'import', backup });
      setRecords(result.records); setStatus(`恢复完成：新增 ${result.imported} 条，本机已有记录保留`);
    } catch (e) { setStatus(`导入失败：${(e as Error).message}`); } finally { setBusy(false); if (file.current) file.current.value = ''; }
  }
  return <div className="xtag-app"><main className="shell">
    <header className="topbar"><div className="brand"><div className="logo" aria-hidden="true">x·</div><div><div className="eyebrow">YOUR PRIVATE INDEX</div><h1>XTag</h1></div></div>{onClose && <button onClick={onClose} aria-label="关闭标签记录">关闭 ×</button>}</header>
    <h2>{author ? `@${author.authorHandle} 的标签记录` : '你的标签记录'}</h2>
    <p className="intro">留住判断，随时回看。标签仅代表你的私人判断。</p>
    <div className="stats" aria-label="标签统计">{TAGS.map(t => <button className="stat" key={t} aria-pressed={tag === t} onClick={() => setTag(tag === t ? '' : t)}><span>{t}</span><strong>{counts[t]}</strong></button>)}</div>
    <div className="toolbar"><input className="search" type="search" placeholder="搜索摘要、博主或帖子 ID" aria-label="搜索历史记录" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="按标签筛选" value={tag} onChange={e => setTag(e.target.value)}><option value="">全部标签</option>{TAGS.map(t => <option key={t}>{t}</option>)}</select><select aria-label="按日期排序" value={ascending ? 'asc' : 'desc'} onChange={e => setAscending(e.target.value === 'asc')}><option value="desc">最近标记优先</option><option value="asc">最早标记优先</option></select></div>
    <p className="muted" aria-live="polite">{filtered.length} 条记录 · 按最后标记时间排序</p>
    {filtered.length === 0 ? <div className="empty">这里还没有记录。<br />在 X 帖子旁展开空白按钮，留下第一个标签。</div> : filtered.slice(0, limit).map(mark => <article className="record" key={mark.postId}>
      <div className="record-top"><strong>{mark.authorDisplayName} <span className="muted">@{mark.authorHandle}</span></strong><span>{mark.tag}</span></div>
      <p className="snippet">{mark.postTextSnippet || '此帖没有文字摘要（可能为图片或视频）'}</p>
      <div className="record-footer"><div><a href={mark.postUrl} target="_blank" rel="noopener noreferrer">查看原帖 ↗</a><div className="muted"><time dateTime={mark.updatedAt}>{new Date(mark.updatedAt).toLocaleString('zh-CN')}</time></div></div><div className="actions"><select aria-label={`修改帖子 ${mark.postId} 的标签`} disabled={busy} value={mark.tag} onChange={e => void change(mark, e.target.value as Tag)}>{TAGS.map(t => <option key={t}>{t}</option>)}</select><button className="danger" disabled={busy} onClick={() => void change(mark, null)}>取消标记</button></div></div>
    </article>)}
    {filtered.length > limit && <button className="load-more" onClick={() => setLimit(limit + 50)}>再显示 50 条</button>}
    <section className="backup"><h2>备份与恢复</h2><p className="muted">JSON 备份包含全部博主的记录。导入只补充缺失帖子，保留本机已有标记。</p><div className="backup-actions"><button disabled={busy} onClick={() => void exportBackup()}>导出全部 JSON</button><button disabled={busy} onClick={() => file.current?.click()}>导入 JSON</button><input ref={file} type="file" accept=".json,application/json" aria-label="选择 JSON 备份" hidden onChange={e => void importBackup(e.target.files?.[0])} /></div></section>
    <p className="status" role="status">{status}</p><p className="footnote">只保存在当前浏览器，不上传、不评分。卸载扩展会删除本地数据，请定期备份。<br />MVP 使用 handle 识别博主；改名可能分开统计，旧 handle 被他人使用时请核对历史。</p>
  </main></div>;
}
