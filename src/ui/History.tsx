import { useEffect, useMemo, useRef, useState } from 'react';
import { TAGS, countsFor, createBackup, filterMarks, type Author, type Mark, type Tag } from '../core/model';
import { request, subscribe } from '../platform/client';

export function History({ author, onClose }: { author?: Author; onClose?: () => void }) {
  const [records, setRecords] = useState<Mark[]>([]);
  const [allAuthors, setAllAuthors] = useState(!author);
  const [tag, setTag] = useState('');
  const [exportTag, setExportTag] = useState<Tag | ''>('');
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
  const scopeAuthor = allAuthors ? undefined : author;
  const counts = useMemo(() => countsFor(records, scopeAuthor), [records, scopeAuthor]);
  const scopeTotal = TAGS.reduce((total, t) => total + counts[t], 0);
  const scopeLabel = scopeAuthor ? `@${scopeAuthor.authorHandle}` : '全部博主';
  const filtered = useMemo(() => filterMarks(records, { author: scopeAuthor, tag, search, ascending }), [records, scopeAuthor, tag, search, ascending]);
  const exportCount = exportTag ? counts[exportTag] : scopeTotal;
  useEffect(() => setLimit(50), [scopeAuthor, tag, search, ascending]);
  async function change(mark: Mark, nextTag: Tag | null) {
    setBusy(true);
    try { setRecords((await request({ type: 'set', post: mark, tag: nextTag })).records); setStatus(nextTag ? '标签已更新' : '已取消标记'); }
    catch (e) { setStatus((e as Error).message); } finally { setBusy(false); }
  }
  async function exportBackup(full = true) {
    setBusy(true);
    try {
      const { records: fresh } = await request({ type: 'list' });
      const backup = createBackup(fresh, full ? {} : { author: scopeAuthor, tag: exportTag || undefined });
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url;
      const date = backup.exportedAt.slice(0, 10);
      a.download = full ? `xtag-backup-${date}.json` : `xtag-export-${scopeAuthor?.authorHandle ?? 'all-authors'}-${exportTag || 'all-tags'}-${date}.json`;
      a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
      setStatus(full ? `已导出全部 ${backup.records.length} 条记录` : `已导出 ${scopeLabel} · ${exportTag || '全部标签'} · ${backup.records.length} 条记录`);
    } catch (e) { setStatus((e as Error).message); } finally { setBusy(false); }
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
    <h2>{scopeAuthor ? `@${scopeAuthor.authorHandle} 的标签记录` : '全部博主的标签记录'}</h2>
    <p className="intro">留住判断，随时回看。标签仅代表你的私人判断。</p>
    {author && <div className="scope-switch" role="group" aria-label="查看范围"><button aria-pressed={!allAuthors} onClick={() => setAllAuthors(false)}>当前博主 @{author.authorHandle}</button><button aria-pressed={allAuthors} onClick={() => setAllAuthors(true)}>全部博主</button></div>}
    <p className="scope-total" aria-live="polite">{scopeLabel}共标记 <strong>{scopeTotal}</strong> 条帖子</p>
    <div className="stats" aria-label="标签统计">{TAGS.map(t => <button className="stat" data-tag={t} key={t} aria-pressed={tag === t} onClick={() => setTag(tag === t ? '' : t)}><span>{t}</span><strong>{counts[t]}</strong></button>)}</div>
    <div className="toolbar"><input className="search" type="search" placeholder="搜索摘要、博主或帖子 ID" aria-label="搜索历史记录" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="按标签筛选" data-tag={tag || undefined} value={tag} onChange={e => setTag(e.target.value)}><option value="">全部标签</option>{TAGS.map(t => <option key={t}>{t}</option>)}</select><select aria-label="按日期排序" value={ascending ? 'asc' : 'desc'} onChange={e => setAscending(e.target.value === 'asc')}><option value="desc">最近标记优先</option><option value="asc">最早标记优先</option></select></div>
    <p className="muted" aria-live="polite">筛选结果 {filtered.length} 条记录 · 按最后标记时间排序</p>
    {filtered.length === 0 ? <div className="empty">{scopeTotal === 0 ? <>这个范围还没有记录。<br />在 X 帖子旁展开空白按钮，留下第一个标签。</> : '没有符合筛选条件的记录，请调整标签或搜索。'}</div> : filtered.slice(0, limit).map(mark => <article className="record" key={mark.postId}>
      <div className="record-top"><strong>{mark.authorDisplayName} <span className="muted">@{mark.authorHandle}</span></strong><span className="tag-badge" data-tag={mark.tag}>{mark.tag}</span></div>
      <p className="snippet">{mark.postTextSnippet || '此帖没有文字摘要（可能为图片或视频）'}</p>
      <div className="record-footer"><div><a href={mark.postUrl} target="_blank" rel="noopener noreferrer">查看原帖 ↗</a><div className="muted"><time dateTime={mark.updatedAt}>{new Date(mark.updatedAt).toLocaleString('zh-CN')}</time></div></div><div className="actions"><select aria-label={`修改帖子 ${mark.postId} 的标签`} data-tag={mark.tag} disabled={busy} value={mark.tag} onChange={e => void change(mark, e.target.value as Tag)}>{TAGS.map(t => <option key={t}>{t}</option>)}</select><button className="danger" disabled={busy} onClick={() => void change(mark, null)}>取消标记</button></div></div>
    </article>)}
    {filtered.length > limit && <button className="load-more" onClick={() => setLimit(limit + 50)}>再显示 50 条</button>}
    <section className="backup"><h2>分类导出</h2><p className="muted">按当前博主范围导出所选标签。搜索和列表筛选仅影响列表。</p><div className="backup-actions"><label className="export-label">导出标签<select aria-label="导出标签" data-tag={exportTag || undefined} disabled={busy} value={exportTag} onChange={e => setExportTag(e.target.value as Tag | '')}><option value="">全部标签</option>{TAGS.map(t => <option key={t}>{t}</option>)}</select></label><button disabled={busy} onClick={() => void exportBackup(false)}>导出所选 JSON</button></div><p className="export-preview muted" aria-live="polite">导出范围：{scopeLabel} · {exportTag || '全部标签'} · {exportCount} 条记录</p></section>
    <section className="backup"><h2>完整备份与恢复</h2><p className="muted">完整备份包含全部博主、全部标签。导入可恢复完整备份或分类文件，只补充缺失帖子，保留本机已有标记。</p><div className="backup-actions"><button disabled={busy} onClick={() => void exportBackup()}>导出全部 JSON</button><button disabled={busy} onClick={() => file.current?.click()}>导入 JSON</button><input ref={file} type="file" accept=".json,application/json" aria-label="选择 JSON 备份" hidden onChange={e => void importBackup(e.target.files?.[0])} /></div></section>
    <p className="status" role="status">{status}</p><p className="footnote">只保存在当前浏览器，不上传、不评分。卸载扩展会删除本地数据，请定期备份。<br />MVP 使用 handle 识别博主；改名可能分开统计，旧 handle 被他人使用时请核对历史。</p>
  </main></div>;
}
