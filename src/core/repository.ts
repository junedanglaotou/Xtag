import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { isTag, validatePost, type Mark, type Post, type Tag } from './model';

export interface Repository {
  list(): Promise<Mark[]>;
  set(post: Post, tag: Tag | null, toggle?: boolean): Promise<void>;
  import(records: Mark[]): Promise<number>;
}
// Future cloud adapters implement the same contract. Sync must carry deletion tombstones and conflicts.
export interface SyncAdapter { push(changes: { records: Mark[]; deletedPostIds: string[] }): Promise<void>; pull(cursor?: string): Promise<{ records: Mark[]; deletedPostIds: string[]; cursor: string }> }
interface Database extends DBSchema { marks: { key: string; value: Mark } }
export class IndexedDbRepository implements Repository {
  private db: Promise<IDBPDatabase<Database>>;
  constructor(name = 'xtag-v1') {
    this.db = openDB<Database>(name, 1, { upgrade(db) { db.createObjectStore('marks', { keyPath: 'postId' }); } });
  }
  async list() { return (await this.db).getAll('marks'); }
  async set(input: Post, tag: Tag | null, toggle = false) {
    const post = validatePost(input);
    if (tag !== null && !isTag(tag)) throw new Error('标签无效');
    const tx = (await this.db).transaction('marks', 'readwrite');
    const old = await tx.store.get(post.postId);
    // Same immutable post ID is evidence for identity promotion; a conflicting known ID is rejected.
    if (old?.authorUserId && post.authorUserId && old.authorUserId !== post.authorUserId) {
      tx.abort(); await tx.done.catch(() => {}); throw new Error('作者 ID 冲突，未保存');
    }
    if (tag === null || (toggle && old?.tag === tag)) await tx.store.delete(post.postId);
    else {
      const now = new Date().toISOString();
      await tx.store.put({ ...post, ...(old?.authorUserId ? { authorUserId: old.authorUserId } : {}),
        tag, createdAt: old?.createdAt ?? now, updatedAt: now });
    }
    await tx.done;
  }
  async import(records: Mark[]) {
    const tx = (await this.db).transaction('marks', 'readwrite');
    let imported = 0;
    for (const record of records) {
      const old = await tx.store.get(record.postId);
      if (old?.authorUserId && record.authorUserId && old.authorUserId !== record.authorUserId) {
        tx.abort(); await tx.done.catch(() => {}); throw new Error('备份与本机作者 ID 冲突，整个导入已取消');
      }
      // Local edits win; restore only missing posts. Never overwrite a later local decision.
      if (!old) { await tx.store.put(record); imported++; }
    }
    await tx.done;
    return imported;
  }
  async close() { (await this.db).close(); }
}
