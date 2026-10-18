import { afterEach, describe, expect, it } from 'vitest';
import { openDB } from 'idb';
import { IndexedDbRepository } from '../../src/core/repository';
import { TAGS, countsFor, filterMarks, isTag, parseBackup, sameAuthor, type Post } from '../../src/core/model';
const post = (id = '101', handle = 'alice'): Post => ({ postId: id, authorHandle: handle, authorDisplayName: handle, postUrl: `https://x.com/${handle}/status/${id}`, postTextSnippet: `笔记 ${id}` });
const repositories: IndexedDbRepository[] = [];
function repo() { const r = new IndexedDbRepository(crypto.randomUUID()); repositories.push(r); return r; }
afterEach(async () => { for (const r of repositories.splice(0)) await r.close(); });
describe('transactional marks', () => {
  it('starts blank, keeps posts independent and authors isolated', async () => {
    const r = repo(); expect(await r.list()).toEqual([]);
    await r.set(post(), '有用'); await r.set(post('102'), '高质'); await r.set(post('103', 'bob'), '谣言');
    expect((await r.list()).length).toBe(3);
    expect(countsFor(await r.list(), post())).toEqual({ 有用: 1, 谣言: 0, 没用: 0, 高质: 1 });
  });
  it('moves tags without double counting, toggles selection off', async () => {
    const r = repo(); await r.set(post(), '有用', true); await r.set(post(), '谣言', true);
    expect(countsFor(await r.list())).toEqual({ 有用: 0, 谣言: 1, 没用: 0, 高质: 0 });
    await r.set(post(), '谣言', true); expect(await r.list()).toEqual([]);
  });
  it('serializes concurrent transactions without losing independent marks', async () => {
    const r = repo(); await Promise.all(Array.from({ length: 50 }, (_, n) => r.set(post(String(n)), '有用')));
    expect(countsFor(await r.list()).有用).toBe(50);
  });
  it('persists after closing and reopening the database', async () => {
    const name = crypto.randomUUID(); const a = new IndexedDbRepository(name); await a.set(post(), '没用'); await a.close();
    const b = new IndexedDbRepository(name); repositories.push(b); expect((await b.list())[0]?.tag).toBe('没用');
  });
  it('preserves createdAt across edits and supports deletion', async () => {
    const r = repo(); await r.set(post(), '有用'); const before = (await r.list())[0]!;
    await r.set(post(), '高质'); const after = (await r.list())[0]!; expect(after.createdAt).toBe(before.createdAt);
    await r.set(post(), null); expect(await r.list()).toEqual([]);
  });
  it('roundtrips backup and keeps local choices on duplicate import', async () => {
    const r = repo(); await r.set(post(), '有用'); const backup = { schemaVersion: 1, records: await r.list() };
    const restored = repo(); expect(await restored.import(parseBackup(backup))).toBe(1);
    await restored.set(post(), '高质'); expect(await restored.import(parseBackup(backup))).toBe(0);
    expect((await restored.list())[0]?.tag).toBe('高质');
  });
  it('filters by tag, author and search, and sorts dates', async () => {
    const r = repo(); await r.set(post('101'), '有用'); await r.set(post('102', 'bob'), '谣言');
    const marks = (await r.list()).map((m, i) => ({ ...m, updatedAt: `2026-10-${i + 10}T00:00:00.000Z` }));
    expect(filterMarks(marks, { tag: '有用', search: '笔记', author: post() }).map(m => m.postId)).toEqual(['101']);
    expect(filterMarks(marks, { ascending: true })[0]?.postId).toBe('101');
    expect(filterMarks(marks)[0]?.postId).toBe('102');
  });
});
describe('validation and identity', () => {
  it('exposes only the renamed four labels for new judgments', () => {
    expect(TAGS).toEqual(['有用', '谣言', '没用', '高质']);
    expect(isTag('没用')).toBe(true); expect(isTag('未知')).toBe(false);
  });
  it('migrates a version-1 database atomically without changing record identity or timestamps', async () => {
    const name = crypto.randomUUID();
    const legacy = await openDB(name, 1, { upgrade(db) { db.createObjectStore('marks', { keyPath: 'postId' }); } });
    const mark = { ...post(), authorUserId: '123', tag: '未知', createdAt: '2026-10-01T01:00:00.000Z', updatedAt: '2026-10-02T02:00:00.000Z' };
    await legacy.put('marks', mark);
    await legacy.put('marks', { ...post('102'), tag: '有用', createdAt: mark.createdAt, updatedAt: mark.updatedAt });
    legacy.close();
    const migrated = new IndexedDbRepository(name); repositories.push(migrated);
    expect((await migrated.list()).find(m => m.postId === '101')).toEqual({ ...mark, tag: '没用' });
    expect(countsFor(await migrated.list())).toEqual({ 有用: 1, 谣言: 0, 没用: 1, 高质: 0 });
    await migrated.close();
    const reopened = new IndexedDbRepository(name); repositories.push(reopened);
    expect((await reopened.list()).find(m => m.postId === '101')).toEqual({ ...mark, tag: '没用' });
    await reopened.set(mark, '没用', true);
    expect((await reopened.list()).map(m => m.postId)).toEqual(['102']);
  });
  it('restores old unknown-label backups as the new label while retaining local edits', async () => {
    const old = { ...post(), tag: '未知', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-02T00:00:00.000Z' };
    const records = parseBackup({ schemaVersion: 1, records: [old] });
    expect(records).toEqual([{ ...old, tag: '没用' }]);
    const r = repo(); await r.import(records);
    expect(countsFor(await r.list()).没用).toBe(1);
    await r.set(post(), '高质'); await r.import(records);
    expect((await r.list())[0]?.tag).toBe('高质');
  });
  it('never joins known conflicting IDs, or a known ID to a handle alone', () => {
    expect(sameAuthor({ ...post(), authorUserId: '1' }, { ...post(), authorUserId: '2' })).toBe(false);
    expect(sameAuthor({ ...post(), authorUserId: '1' }, post())).toBe(false);
    expect(sameAuthor(post(), { ...post(), authorHandle: 'ALICE' })).toBe(true);
    expect(sameAuthor({ ...post(), authorUserId: '1' }, { ...post('102', 'renamed'), authorUserId: '1' })).toBe(true);
  });
  it('only promotes identity for the same immutable post', async () => {
    const r = repo(); await r.set(post(), '有用'); await r.set({ ...post(), authorUserId: '123' }, '高质');
    expect((await r.list())[0]?.authorUserId).toBe('123');
  });
  it('rejects conflicting stable IDs without changing the existing mark', async () => {
    const r = repo(); await r.set({ ...post(), authorUserId: '123' }, '有用');
    await expect(r.set({ ...post(), authorUserId: '456' }, '谣言')).rejects.toThrow('ID 冲突');
    expect((await r.list())[0]?.tag).toBe('有用');
  });
  it('rolls back an entire import if a later record conflicts', async () => {
    const r = repo(); await r.set({ ...post(), authorUserId: '123' }, '有用');
    const original = (await r.list())[0]!;
    await expect(r.import([{ ...original, ...post('555') }, { ...original, authorUserId: '999' }])).rejects.toThrow('ID 冲突');
    expect((await r.list()).map(m => m.postId)).toEqual(['101']);
  });
  it.each([
    { schemaVersion: 2, records: [] },
    { schemaVersion: 1, records: [{ ...post(), tag: '恶意', createdAt: '2026-10-10', updatedAt: '2026-10-10' }] },
    { schemaVersion: 1, records: [{ ...post(), tag: '有用', postUrl: 'javascript:alert(1)', createdAt: '2026-10-10', updatedAt: '2026-10-10' }] },
    { schemaVersion: 1, records: [{ ...post(), tag: '有用', createdAt: 'bad', updatedAt: 'bad' }] },
  ])('rejects invalid backup before any write', bad => { expect(() => parseBackup(bad)).toThrow(); });
  it('rejects duplicate post IDs and reverse timestamps', async () => {
    const r = repo(); await r.set(post(), '有用'); const m = (await r.list())[0]!;
    expect(() => parseBackup({ schemaVersion: 1, records: [m, m] })).toThrow();
    expect(() => parseBackup({ schemaVersion: 1, records: [{ ...m, createdAt: '2099-01-01' }] })).toThrow();
  });
});
