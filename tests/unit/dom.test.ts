import { describe, expect, it } from 'vitest';
import { recognizePost, profileHandle } from '../../src/dom/recognize';
function article(html: string) { document.body.innerHTML = `<article data-testid="tweet">${html}</article>`; return document.querySelector('article')!; }
const link = (handle: string, id: string) => `<a role="link" href="/${handle}/status/${id}"><time>1h</time></a>`;
describe('outer post recognition', () => {
  it('recognizes ordinary timestamp and author anchors with role=link from real X', () => {
    const el = article(`<div data-testid="User-Name"><a role="link" href="/alice"><span>Alice</span></a></div>${link('alice', '101')}<div data-testid="tweetText">Real X anchor roles</div>`);
    expect(recognizePost(el)).toMatchObject({ postId: '101', authorHandle: 'alice', authorDisplayName: 'Alice', postTextSnippet: 'Real X anchor roles' });
  });
  it.each(['quoteTweet', 'card.wrapper'])('still excludes nested status anchors inside %s', testId => {
    const quoted = `<div data-testid="${testId}">${link('quoted', '999')}<div data-testid="tweetText">Quoted text</div></div>`;
    expect(recognizePost(article(`${quoted}${link('alice', '101')}<div data-testid="tweetText">Outer text</div>`)))
      .toMatchObject({ postId: '101', authorHandle: 'alice', postTextSnippet: 'Outer text' });
    expect(recognizePost(article(quoted))).toBeNull();
  });
  it('uses outer timestamp even when a quote appears first', () => {
    const el = article(`<div role="link">${link('quoted', '99')}</div><div data-testid="User-Name"><a><span>Alice</span></a></div>${link('Alice', '101')}<div data-testid="tweetText">Outer</div>`);
    expect(recognizePost(el)).toMatchObject({ postId: '101', authorHandle: 'alice', postTextSnippet: 'Outer', authorDisplayName: 'Alice' });
  });
  it('ignores nested articles and quoted text', () => {
    const el = article(`${link('alice', '101')}<article data-testid="tweet">${link('bob', '102')}<div data-testid="tweetText">Wrong</div></article><div data-testid="tweetText">Right</div>`);
    expect(recognizePost(el)?.postTextSnippet).toBe('Right');
  });
  it('retweet social context cannot replace author permalink', () => {
    expect(recognizePost(article(`<div data-testid="socialContext"><a href="/bob">Bob reposted</a></div>${link('alice', '101')}`))?.authorHandle).toBe('alice');
  });
  it('fails closed when ambiguous or missing outer timestamp', () => {
    expect(recognizePost(article(link('alice', '101') + link('bob', '102')))).toBeNull();
    expect(recognizePost(article(`<div role="link">${link('bob', '102')}</div>`))).toBeNull();
  });
  it('re-evaluates recycled DOM nodes', () => {
    const el = article(link('alice', '101')); expect(recognizePost(el)?.postId).toBe('101');
    el.innerHTML = link('bob', '102'); expect(recognizePost(el)?.postId).toBe('102');
  });
  it('rejects external status links', () => {
    expect(recognizePost(article('<a href="https://evil.test/alice/status/101"><time>now</time></a>'))).toBeNull();
  });
  it('detects profile tabs and excludes system/detail routes', () => {
    expect(profileHandle('/Alice')).toBe('alice'); expect(profileHandle('/alice/media')).toBe('alice');
    for (const path of ['/home', '/search', '/i', '/alice/status/101', '/settings']) expect(profileHandle(path)).toBeNull();
  });
});
