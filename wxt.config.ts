import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: ({ browser }) => ({
    name: 'XTag · 私人帖子标签',
    description: '为 X 帖子添加私人标签，在本机保存博主分类记录。无账号、无上传。',
    version: '0.1.2',
    permissions: ['storage'],
    ...(browser === 'firefox' ? {
      browser_specific_settings: {
        gecko: { id: 'xtag@private.local', strict_min_version: '140.0', data_collection_permissions: { required: ['none'] } },
        gecko_android: { strict_min_version: '142.0' },
      },
    } : {}),
  }),
});
