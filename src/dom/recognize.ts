import type { Post } from '../core/model';
export const ARTICLE = 'article[data-testid="tweet"]';
// Real X gives ordinary author and timestamp anchors role="link" too. Only
// non-anchor link containers are a nesting boundary; quote/card rules still apply.
const EXCLUDED = '[data-testid="quoteTweet"], [data-testid="card.wrapper"], [role="link"]:not(a)';
export function ownedBy(article: HTMLElement, element: Element) {
  return element.closest(ARTICLE) === article && !element.closest(EXCLUDED);
}
export function recognizePost(article: HTMLElement): Post | null {
  // The outer timestamp permalink, never the first /status/ link (which may belong to a quote).
  const times = [...article.querySelectorAll('a[href] time')].filter(time => ownedBy(article, time));
  const candidates = times.map(time => time.closest('a')!).map(link => {
    try {
      const url = new URL(link.getAttribute('href')!, 'https://x.com');
      if (!['x.com', 'twitter.com', 'www.x.com', 'www.twitter.com'].includes(url.hostname)) return null;
      return url.pathname.match(/^\/([A-Za-z0-9_]{1,15})\/status\/(\d{1,30})\/?$/);
    } catch { return null; }
  }).filter(match => match !== null);
  const unique = new Set(candidates.map(match => match![2]));
  if (unique.size !== 1) return null;
  const match = candidates[0]!;
  const authorHandle = match[1]!.toLowerCase();
  const names = [...article.querySelectorAll('[data-testid="User-Name"]')].find(el => ownedBy(article, el));
  const authorDisplayName = names?.querySelector('a span')?.textContent?.trim().slice(0, 200) || authorHandle;
  const text = [...article.querySelectorAll('[data-testid="tweetText"]')].find(el => ownedBy(article, el));
  return { postId: match[2]!, authorHandle, authorDisplayName,
    postUrl: `https://x.com/${authorHandle}/status/${match[2]}`,
    postTextSnippet: (text?.textContent || '').trim().slice(0, 1000) };
}
const RESERVED = new Set(['home', 'explore', 'search', 'notifications', 'messages', 'settings', 'i', 'compose', 'login', 'logout', 'signup', 'tos', 'privacy']);
export function profileHandle(pathname: string): string | null {
  const match = pathname.match(/^\/([A-Za-z0-9_]{1,15})(?:\/(?:with_replies|media|highlights|articles))?\/?$/);
  return match && !RESERVED.has(match[1]!.toLowerCase()) ? match[1]!.toLowerCase() : null;
}
