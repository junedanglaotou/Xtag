# XTag — X 帖子私人标签

一个可本地加载的 WebExtension MVP。为每条 X 帖子独立标记「有用 / 谣言 / 没用 / 高质」，按博主查看历史。数据保存在扩展自己的 IndexedDB 中；无上传、无评分、无账号。

GitHub：<https://github.com/junedanglaotou/Xtag>

0.1.3 将「未知」改名为「没用」，并统一以背景高亮区分标签：有用青色、谣言红色、没用黄色、高质蓝色。文字颜色保持一致；未标记帖子仍空白。帖子按钮、下拉菜单、主页汇总和历史记录同步更新。原本的「未知」本地记录会在原数据库中原子迁移为「没用」，ID、摘要和标记时间保留；导入旧 JSON 备份也会自动转换。

0.1.2 已修复所有浏览器共用的帖子识别错误：真实 X 的作者 / 时间链接含 `role="link"`，旧版会误判为嵌套卡片并跳过。现在只排除非 `<a>` 的 link 容器，同时保留 quoteTweet / card.wrapper 规则。请使用 0.1.2 或更新版本，并在更新扩展后刷新 X。用户已报告 Arc 的真实 X 按钮和四项菜单正常；这不等于其他浏览器或持久化等全流程已在真实 X 验证。

构建下载：[GitHub Actions](https://github.com/junedanglaotou/Xtag/actions) 中打开成功的 `XTag checks` 运行，在 Artifacts 下载 `xtag-0.1.3`；其中包含 Chrome / Edge、Firefox、Safari 转换源和完整源码包。GitHub 下载 Actions artifact 可能要求登录。本地现成产物在 `dist/`。

> 本版本浏览器测试使用本地 X DOM fixtures。没有登录真实 X，不能将测试结果理解为真实 X 网站已验证。Safari 源构建不等于已签名可安装的 Safari App。详见 [测试报告](TEST_REPORT.md) 和 [兼容性](COMPATIBILITY.md)。

## 立即安装 Chrome / Edge

1. 下载 `dist/xtag-0.1.3-chrome-edge.zip` 并解压到固定目录。也可以直接使用本项目 `.output/chrome-mv3`。
2. Chrome 打开 `chrome://extensions`；Edge 打开 `edge://extensions`。
3. 打开「开发者模式」，点「加载已解压的扩展」，选择**直接包含 manifest.json 的目录**。不要选择 ZIP 或项目根目录。
4. 打开或刷新 `https://x.com`，使用浏览器扩展站点权限设置允许在 X 上运行。
5. 在可识别的普通帖子作者旁展开空白小框。选择标签后仅显示对应两个字。

安装不需要在扩展中输入 X 密码；使用浏览器原本的 X 登录即可。更新扩展后刷新 X。日常更新请保留相同加载目录和浏览器配置，否则扩展身份可能变化。卸载前先导出 JSON。

## 使用

- 菜单的次数是该博主**已标记的全部有效帖子**数量。重复选择当前标签会取消；换标签不会重复计数。
- 桌面按钮在作者信息附近；≤600px 尝试放在头像下方。菜单进入浏览器顶层，不受帖子 overflow 裁剪。
- 博主主页姓名区出现「标签记录」和四类次数；点击查看该博主历史。
- 点击浏览器工具栏 XTag →「打开标签记录」可查看全部博主，搜索摘要 / handle / 帖子 ID，按分类筛选，按最后标记时间排序，修改和取消标签。
- 「查看原帖」在新页签打开原始 status 链接。记录只保存文字摘要，不保存媒体。
- 「导出全部 JSON」备份所有博主数据。「导入 JSON」仅补充本机缺失帖子；已有本机标记保留。导入前整体校验，事务内遇到 ID 冲突整体回滚。
- 没有百分比、信誉分或所谓造谣率。所有标签都只代表个人判断。

## Firefox、Android 与 Safari

Firefox 桌面临时测试：解压 `xtag-0.1.3-firefox-unsigned.xpi`（ZIP 格式），打开 `about:debugging#/runtime/this-firefox`，点「临时载入附加组件」并选择 manifest.json。临时安装在重启 Firefox 后失效；正常长期安装需要 Mozilla 签名，不能把未签名 XPI 当作正式安装包。

Android Firefox 正常发行安装需要签名版本，当前没有签名。开发者可以使用 `web-ext run --target=firefox-android` 配合 ADB 和 USB 调试在自己的测试设备临时安装；具体步骤见 [COMPATIBILITY.md](COMPATIBILITY.md)。

Safari：交付 `.output/safari-mv2` 和 `xtag-0.1.3-safari-webextension.zip`，仅供 macOS 上 Xcode 转换。不能直接在 iPhone 点 ZIP 安装。macOS 下运行 `sh scripts/convert-safari.sh` 后，在 Xcode 完成团队选择、签名与目标设备运行。见兼容性文档。

Desktop Site 只是显示模式。官方 Android Chrome 不应按普通桌面 Chrome 扩展方式安装。第三方 Chromium 浏览器需逐个验证其扩展安装能力。

## 开发与复现

需要 Node.js 24、npm 和支持的桌面系统。

```sh
npm ci
npm run typecheck
npm test
npm run build:all
npx playwright install chromium
npm run test:e2e
npm run package
```

开发：`npm run dev`；Firefox：`npx wxt -b firefox`。Linux CI 安装浏览器可用 `npx playwright install --with-deps chromium`。

Windows 本环境中 Playwright 默认启动管道及 load-extension 启动参数无法正常完成，测试启动器使用隔离的临时配置，通过本机 CDP 端口和 Chromium `Extensions.loadUnpacked` API 加载扩展；不操作日常浏览器。Linux CI 使用标准 Playwright 持久上下文。`XTAG_BROWSER` 可指定测试浏览器可执行文件，但普通品牌 Chrome 的调试扩展能力取决于其版本。

## 结构

```text
entrypoints/          WXT 入口：content、background、popup、records
src/core/             标签、身份、筛选、备份校验、Repository 和同步接口
src/platform/         WXT 跨浏览器消息与更新订阅
src/dom/              帖子 / 博主路由识别
src/content/          MutationObserver、幂等注入、Shadow DOM、顶层菜单
src/ui/               React 历史与备份界面
tests/unit/           Vitest + fake-indexeddb + jsdom
tests/e2e/            Playwright 真实扩展 + 拦截 x.com 的 DOM fixtures
scripts/              可复现 ZIP / XPI 打包、Safari 转换
.github/workflows/    构建、测试与 artifacts 上传
```

写入只通过扩展后台执行，后台串行接收请求，IndexedDB 读写事务保证原子性。统计始终从有效记录计算。`Repository` 可替换；`SyncAdapter` 预留记录、删除 tombstone 和 cursor，不实现服务器或云账号。

DOM 不推测 User ID。以标准化 handle 保存；取得可靠 ID 的同一不可变 postId 可以提升该条身份，但不基于名字相似或 handle 自动合并其他身份。改名、handle 复用及身份迁移边界见 [已知限制](KNOWN_LIMITATIONS.md)。自定义标签仅预留类型 / 数据层扩展位置，本版本只接受四类标签，新增自定义标签需备份 schema 迁移和 UI 扩展。

## 自己账号上的验收

1. 同博主两帖分别标「有用」和「高质」，确认未标记的新帖仍空白。
2. 改第一帖为「谣言」，展开两帖菜单，确认有用少一、谣言多一，其他博主不受影响。
3. 再选「谣言」取消，刷新页面和重启浏览器，核对剩余记录。
4. 在 For You、Following、搜索、帖子详情、博主主页滚动；留意引用 / 转发是否绑定外层作者和原帖。
5. 在主页打开历史，筛选、搜索、编辑并打开原帖。
6. 导出 JSON，在另一个测试浏览器配置中安装后导入，核对标签和数量。
7. 切换 X 深浅主题、390px 窄屏和手机 Desktop Site，检查按钮、原生菜单、点击和滚动。

真实站点 DOM 如有差异，请提供页面类型和脱敏后的相关 article HTML。不要发送 Session Cookie。

更多：[隐私说明](PRIVACY.md) · [政策审查](POLICY_REVIEW.md) · [测试报告](TEST_REPORT.md) · [已知限制](KNOWN_LIMITATIONS.md)


Safari 无法使用时，请先看 [Safari 安装与故障排查](SAFARI_TROUBLESHOOTING.md)。0.1.2 新增旧版 Popover 回退及 macOS 原生编译工作流；原生 App 仍需区分开发构建与签名发行。
