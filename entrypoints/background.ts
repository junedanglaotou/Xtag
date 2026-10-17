import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { IndexedDbRepository } from '../src/core/repository';
import { parseBackup } from '../src/core/model';
import type { Request } from '../src/platform/client';

export default defineBackground(() => {
  const repository = new IndexedDbRepository();
  let queue: Promise<unknown> = Promise.resolve();
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message?.xtag || sender.id !== browser.runtime.id) return;
    const run = async () => {
      try {
        const req = message as Request;
        let imported: number | undefined;
        if (req.type === 'set') await repository.set(req.post, req.tag, req.toggle);
        else if (req.type === 'import') imported = await repository.import(parseBackup(req.backup));
        else if (req.type !== 'list') throw new Error('未知请求');
        if (req.type !== 'list') await browser.storage.local.set({ xtagRevision: crypto.randomUUID() });
        return { ok: true, records: await repository.list(), imported };
      } catch (error) { return { ok: false, error: error instanceof Error ? error.message : '保存失败' }; }
    };
    const result = queue.then(run, run);
    queue = result.catch(() => {});
    void result.then(sendResponse);
    return true;
  });
});
