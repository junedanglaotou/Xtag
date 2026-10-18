export const TAGS = ['有用', '谣言', '没用', '高质'] as const;
export type Tag = typeof TAGS[number];
export interface Author { authorUserId?: string; authorHandle: string; authorDisplayName: string }
export interface Post extends Author { postId: string; postUrl: string; postTextSnippet: string }
export interface Mark extends Post { tag: Tag; createdAt: string; updatedAt: string }
export type Counts = Record<Tag, number>;
export const normalizeHandle = (handle: string) => handle.replace(/^@/, '').toLowerCase();
export const isTag = (value: unknown): value is Tag => TAGS.includes(value as Tag);
// Retain compatibility with backups made before the label rename.
export const LEGACY_UNKNOWN_TAG = '未知';
export function sameAuthor(a: Author, b: Author): boolean {
  // Never join two known, different IDs or silently join a handle-only identity to a known ID.
  if (a.authorUserId || b.authorUserId) return !!a.authorUserId && a.authorUserId === b.authorUserId;
  return normalizeHandle(a.authorHandle) === normalizeHandle(b.authorHandle);
}
export function countsFor(marks: Mark[], author?: Author): Counts {
  const counts: Counts = { 有用: 0, 谣言: 0, 没用: 0, 高质: 0 };
  for (const mark of marks) if (!author || sameAuthor(mark, author)) counts[mark.tag]++;
  return counts;
}
export function filterMarks(marks: Mark[], options: { author?: Author; tag?: string; search?: string; ascending?: boolean } = {}) {
  const search = options.search?.trim().toLowerCase();
  return marks.filter(mark => (!options.author || sameAuthor(mark, options.author)) &&
    (!options.tag || mark.tag === options.tag) && (!search ||
      `${mark.authorHandle} ${mark.authorDisplayName} ${mark.postTextSnippet} ${mark.postId}`.toLowerCase().includes(search)))
    .sort((a, b) => (options.ascending ? 1 : -1) * (a.updatedAt.localeCompare(b.updatedAt) || a.postId.localeCompare(b.postId)));
}
export function createBackup(marks: Mark[], options: { author?: Author; tag?: Tag } = {}) {
  // Exports have an explicit scope. Search, sort and display pagination do not limit them.
  const records = marks.filter(mark => (!options.author || sameAuthor(mark, options.author)) &&
    (!options.tag || mark.tag === options.tag));
  return { schemaVersion: 1 as const, exportedAt: new Date().toISOString(), records };
}
export function validatePost(value: unknown): Post {
  if (!value || typeof value !== 'object') throw new Error('帖子数据格式错误');
  const p = value as Record<string, unknown>;
  if (typeof p.postId !== 'string' || !/^\d{1,30}$/.test(p.postId) ||
      typeof p.authorHandle !== 'string' || !/^[A-Za-z0-9_]{1,15}$/.test(p.authorHandle) ||
      typeof p.authorDisplayName !== 'string' || p.authorDisplayName.length > 200 ||
      typeof p.postTextSnippet !== 'string' || p.postTextSnippet.length > 1000 ||
      (p.authorUserId !== undefined && (typeof p.authorUserId !== 'string' || !/^\d{1,30}$/.test(p.authorUserId)))) throw new Error('帖子字段无效');
  const handle = normalizeHandle(p.authorHandle);
  const canonical = `https://x.com/${handle}/status/${p.postId}`;
  if (p.postUrl !== canonical) throw new Error('原帖链接必须与作者及帖子 ID 一致');
  return { postId: p.postId, authorHandle: handle, authorDisplayName: p.authorDisplayName,
    postTextSnippet: p.postTextSnippet, postUrl: canonical, ...(p.authorUserId ? { authorUserId: p.authorUserId as string } : {}) };
}
export function parseBackup(value: unknown): Mark[] {
  if (!value || typeof value !== 'object') throw new Error('备份格式错误');
  const backup = value as Record<string, unknown>;
  if (backup.schemaVersion !== 1 || !Array.isArray(backup.records) || backup.records.length > 100000) throw new Error('不支持的备份版本或记录过多');
  const seen = new Set<string>();
  return backup.records.map(value => {
    const post = validatePost(value);
    const m = value as Record<string, unknown>;
    const tag = m.tag === LEGACY_UNKNOWN_TAG ? '没用' : m.tag;
    if (!isTag(tag) || typeof m.createdAt !== 'string' || typeof m.updatedAt !== 'string' ||
        !Number.isFinite(Date.parse(m.createdAt)) || !Number.isFinite(Date.parse(m.updatedAt)) ||
        Date.parse(m.createdAt) > Date.parse(m.updatedAt) || seen.has(post.postId)) throw new Error('备份包含无效标签、时间或重复帖子');
    seen.add(post.postId);
    return { ...post, tag, createdAt: new Date(m.createdAt).toISOString(), updatedAt: new Date(m.updatedAt).toISOString() };
  });
}
