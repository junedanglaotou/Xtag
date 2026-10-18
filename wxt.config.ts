import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  // Vite 8 uses Rolldown; WXT's old esbuild charset setting no longer applies.
  vite: () => ({ build: { rolldownOptions: { output: { charset: 'ascii' } } } }),
  hooks: {
    'build:publicAssets'(wxt, files) {
      if (wxt.config.manifestVersion === 2) files.push({
        relativeDest: 'background-utf8.html',
        contents: '<!doctype html><html><head><meta charset="utf-8"><title>XTag background</title></head><body><script src="background.js"></script></body></html>\n',
      });
    },
    'build:manifestGenerated'(wxt, manifest) {
      if (wxt.config.manifestVersion !== 2 || !manifest.background) return;
      if ('service_worker' in manifest.background) throw new Error('MV2 background must be a document');
      const { scripts: _scripts, ...background } = manifest.background;
      manifest.background = { ...background, page: 'background-utf8.html' };
    },
  },
  manifest: ({ browser }) => ({
    name: 'XTag · 私人帖子标签',
    description: '为 X 帖子添加私人标签，在本机保存博主分类记录。无账号、无上传。',
    version: '0.1.5',
    permissions: ['storage'],
    ...(browser === 'firefox' ? {
      browser_specific_settings: {
        gecko: { id: 'xtag@private.local', strict_min_version: '140.0', data_collection_permissions: { required: ['none'] } },
        gecko_android: { strict_min_version: '142.0' },
      },
    } : {}),
  }),
});
