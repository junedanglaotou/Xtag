import { browser } from 'wxt/browser';
import type { Mark, Post, Tag } from '../core/model';
export type Request = { type: 'list' } | { type: 'set'; post: Post; tag: Tag | null; toggle?: boolean } | { type: 'import'; backup: unknown };
export async function request(message: Request): Promise<{ records: Mark[]; imported?: number }> {
  const response = await browser.runtime.sendMessage({ xtag: true, ...message });
  if (!response?.ok) throw new Error(response?.error || 'XTag 后台无法连接，请刷新页面后重试');
  return response;
}
export function subscribe(listener: () => void) {
  const handler = (changes: Record<string, unknown>, area: string) => { if (area === 'local' && changes.xtagRevision) listener(); };
  browser.storage.onChanged.addListener(handler);
  return () => browser.storage.onChanged.removeListener(handler);
}
