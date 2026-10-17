import { defineContentScript } from 'wxt/utils/define-content-script';
import { startXTag } from '../src/content/controller';
export default defineContentScript({
  matches: ['https://x.com/*', 'https://www.x.com/*', 'https://twitter.com/*', 'https://www.twitter.com/*'],
  runAt: 'document_idle',
  main(ctx) { ctx.onInvalidated(startXTag()); },
});
