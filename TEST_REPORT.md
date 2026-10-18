# XTag 0.1.4 测试报告

日期：2026-10-18。Windows、Node.js 24.12.0。用户优先要求 macOS GitHub 下载正式安装，确认尚未开通 Apple 开发者会员。

## 本次结果

- TypeScript 通过。Vitest **32/32 通过**（3 个文件，2.08s）。Chrome MV3 / Firefox MV2 / Safari MV2 生产构建通过，权限仍只有 storage 及原 X 域名内容脚本范围。
- Playwright **17/17 通过（36.6s）**，含之前的原地升级、备份迁移、深浅配色、手机 / 桌面 fixture。
- 新增实际 Safari 构建文件的编码回归：原始 background-utf8.html / background.js 放入 Chromium MV3 测试容器，UTF-8 characterSet、四标签保存与刷新、取消后刷新、中文「标签无效」提示均通过。后台 HTML / JS 没有改写；仅用于加载的 manifest 换成 MV3 兼容容器并添加空 worker。
- 新增 popup HTML 内原生历史链接测试：捕获新标签页 URL，读取已保存记录，通过。这里并非点击真实 Safari 工具栏弹窗。
- `npm run check:builds` 检查三种产物：MV2 显式 UTF-8 页面 / page 字段、背景脚本全部 ASCII 字节、权限范围，通过。打包时再次执行检查。
- 本地旧 0.1.3 Safari ZIP 对照：background.scripts、无 UTF-8 后台页、background.js 有 348 个非 ASCII 字节；新 0.1.4 ZIP 为 background.page、含 UTF-8 后台页、非 ASCII 字节为 0。
- macOS 未签名编译 CI 新增逐字节验证内嵌 background.js、background-utf8.html，及签名脚本 bash 语法检查；远程本次结果以 Actions 为准。

## 用户真实 Safari 反馈与未完成项

用户报告 0.1.3 的自动后台页面实际为 windows-1252，中文标签校验及错误提示损坏；本机加 meta charset、background.page、Unicode 转义后，保存、刷新保留、个人页历史、取消均通过。此为用户实际测试反馈，本项目没有独立复核用户浏览器。0.1.4 真实 Safari、重开 Safari / Mac、实际 popup 点击仍需复测。

Developer ID 签名、公证、staple / Gatekeeper 校验流程已实现，但因无会员 / 证书 / 凭据，尚未执行，当前没有 `macos-developer-id.zip` 正式产物。未签名 App 编译通过不等于长期安装通过。完整说明见 SAFARI_DEVELOPER_ID.md。

本次第一次类型检查发现 manifest background 的 MV2 / MV3 联合类型未收窄，已补充检查后通过；不影响数据逻辑。Windows 本地没有 Bash，未将脚本语法记为本地验证通过；将在 macOS CI 检查。

## 历史报告（0.1.3）

# XTag 0.1.3 测试报告

日期：2026-10-18。Windows、Node.js 24.12.0、npm 11.6.2。

## 同身份更新保留数据回归（0.1.3 后续验证）

用户反馈自己在桌面 Chrome 更换版本后看不到原标签；Safari 由其他人测试，安装方式未确认。本项目未检查用户现有扩展 ID、目录或本机数据，尚不能确认实际丢失原因或承诺恢复。

- 新增真实 Chromium 更新场景：在版本号 0.1.2 的旧 schema fixture 扩展中写入 IndexedDB v1 记录，退出后把当前生产构建覆盖进原目录，以相同浏览器配置启动，核对扩展 ID、标签迁移、主页次数、JSON 中每条记录及时间戳，再重启验证保留。
- 完整浏览器回归 **15/15 通过（30.5s）**；TypeScript 通过。此前的 32 项单元测试结论不变，本次没有改动运行时代码或数据库名称，也没有产生另一个扩展版本。
- 旧 fixture 是数据结构模拟，不是历史 0.1.2 原始生产包。这验证了 Chromium 中相同身份的原地更新，不是 Safari / App Store 升级实测，也没有模拟卸载重装后的恢复。
- 发布费用、正式分发及旧用户操作步骤已写入 RELEASE_AND_UPDATES.md，加入源码包；账号、签名、商店提交和 Safari 两构建升级验收仍未完成。

## 本次标签改名及背景高亮

- 四种标签：有用（青色）、谣言（红色）、没用（黄色）、高质（蓝色）。帖子按钮、菜单、主页汇总和历史记录共用配色，所有分类继承相同文字色，未标记帖子保持空白。
- 原数据库升级到版本 2，将「未知」原子迁移为「没用」，保留记录 ID、作者、摘要及创建 / 更新时间。旧 schemaVersion 1 JSON 备份导入时也自动转换，不覆盖已有标记。
- Vitest **32/32 通过**（3 个文件），包含旧数据库升级、重新打开、次数及取消操作、旧备份兼容。
- Chromium 实际扩展 Playwright **14/14 通过**（31.4s）。新增浅色 / 深色背景与相同文字色校验，以及旧备份导入、筛选、导出、时间保留和取消标签流程。
- 新测试首轮为 12 通过 / 2 失败：视口自动滚动会关闭刚打开的菜单。现改为随仍可见的帖子定位菜单，帖子离开视口时关闭，并避免聚焦菜单触发滚动；完整回归通过。
- TypeScript 与 Chrome MV3 / Firefox MV2 / Safari MV2 三种生产构建通过。
- 截图：test-results/tag-highlights-light.png、tag-highlights-dark.png、history-highlights-light.png、history-highlights-dark.png，已目视检查标签颜色。

本次浏览器测试加载真实生产扩展，但 x.com 内容使用本地 DOM fixtures；没有独立验证真实 X，也没有运行 Firefox / Safari 或手机真机。GitHub Actions 本次运行结果见仓库 Actions。

## 历史测试记录（0.1.2）

# XTag 0.1.2 测试报告

日期：2026-10-18。

## 本次识别修复及证据

真实 X 的普通作者与时间链接含 role="link"。此前 EXCLUDED 使用 [role="link"]，closest() 因匹配正常 anchor 而返回排除结果。该逻辑被所有浏览器共用，故不是 Arc 专属错误。

- 先补齐单元 fixture 的 role 属性：修复前复现 7 项失败、22 项通过。
- 改为 [role="link"]:not(a)，保留 quoteTweet / card.wrapper 排除规则。
- 单元回归：29/29 通过（3 个文件，2.17s），包含普通 role anchor、quoteTweet、card.wrapper、非 anchor 引用容器、嵌套 article、节点复用。
- Chromium 实际扩展回归：11/11 通过（23.3s）；所有普通帖的头像 / 作者 / 时间 fixture 都带 role="link"。使用真实扩展的后台 / IndexedDB / 内容脚本 / React，但网络内容仍是 DOM fixtures。
- TypeScript 与 Chrome MV3 / Firefox MV2 / Safari MV2 构建通过。
- 已新增 Mac 打包校验：App 中的 manifest 和 content.js 必须与本次 Safari 源构建逐字节一致，防止打包旧代码；本次远程运行结果见 GitHub Actions。

## 真实页面验证的归属

用户报告：在 Arc 真实 X 修改排除条件后，标签按钮和四项菜单正常出现。此为用户实测反馈，本项目未独立复核该会话，不能据此宣称保存 / 重启 / 全部浏览器的真实 X 流程通过。

用户提供的 Safari 截图说明此前尚未完成安装；这与共享 DOM 错误分开记录。Firefox / Edge / Safari 等目标尚未逐一做真实 X 验证。官方 Android Chrome 的扩展安装限制也不会被本次 DOM 修复改变。

## 历史测试记录（0.1.0—0.1.1）

# XTag 测试报告

日期：2026-10-18。环境：Windows、Node.js 24.12.0、npm 11.6.2。

## 已执行

- TypeScript 类型检查通过。
- Chrome MV3、Firefox MV2、Safari MV2 WebExtension 构建成功。
- Vitest 最终复跑 **23/23 通过**（2 个测试文件，1.25s），包含身份冲突和整批导入回滚。
- Chromium 浏览器最终完整复跑 **11/11 通过**（20.1s），包括刷新、完整浏览器重启和观察器执行前的 DOM 复用竞态。首轮 9 通过 / 1 失败，旧调试端口文件问题已修复并验证。
- 联网 npm audit：0 个已报告漏洞。
- GitHub Actions 的首轮 Ubuntu 构建、类型检查、单元测试、10 项浏览器测试和打包全流程[已通过](https://github.com/junedanglaotou/Xtag/actions/runs/39080107681)；后续提交的运行状态见仓库 Actions。

## 测试范围

| 验收要求 | 自动化结果 |
| --- | --- |
| 1 新帖空白、2 展开菜单、3 选标签显示 | 浏览器通过 |
| 4 同博主多帖独立、5 不同博主隔离 | 单元 + 浏览器通过 |
| 6 修改迁移计数、7 取消减少计数 | 单元 + 浏览器通过 |
| 8 刷新后保留 | 浏览器通过，额外验证进程重启 |
| 9 无限插入无重复 | 浏览器通过，70 条追加、节点复用 / 移除 |
| 10 博主主页统计、11 历史筛选 | 浏览器通过 |
| 12 记录打开原帖 | 浏览器通过，实际捕获新页签 URL |
| 13 手机窄屏 | 390×844 视口 / 深色 fixture 通过，非真机 |
| 14 桌面模式 | 980×800 视口 / 浅色 fixture 通过，非 Android |

额外：跨页签通知、恶意字符串按纯文本显示、非法 JSON 拒绝、搜索 / 排序 / 历史编辑与取消、SPA 前进后退、50 个并发事务、ID 冲突回滚通过。菜单打开后 DOM 立即复用的竞态也已验证：点击旧菜单不会给旧帖或新帖写入错误标签。

单元测试包含有效记录统计、修改 / 取消、不同博主隔离、50 个并发写入、数据库关闭再打开、JSON 备份恢复、非法数据、身份匹配、DOM 引用 / 转发 / 嵌套 / 节点复用、路由检测。

Playwright 使用 Chrome for Testing 156.0.8078.4 加载实际生产 MV3 扩展，真实运行后台、IndexedDB、内容脚本和 React。x.com 的网络响应被替换为本地 DOM fixtures，无真实账号或真实 X 数据。

浏览器场景覆盖新帖空白、展开菜单、选择标签、同博主多帖独立、不同博主隔离、改标签计数迁移、取消计数减少、刷新 / 浏览器重启、无限插入与复用节点、主页汇总、筛选 / 搜索 / 排序、原帖新页签、JSON 下载 / 导入、390×844 深色与 980×800 浅色布局、SPA 前进后退、跨页签一致性。

## 证据与复现

`npm test`、`npm run test:e2e`；浏览器结果输出在 `test-results/e2e.json`、`playwright-report/index.html`，失败时保存 trace。截图在 `test-results/mobile-narrow.png` 和 `test-results/desktop-site-layout.png`。

没有登录真实 X，没有验证真实 For You / Following / 搜索页面。视口模拟不等于 Android / iOS 真机通过。Firefox 和 Safari 仅构建，没有运行。远程 CI 是否通过另行记录。


0.1.1 更新：26/26 单元测试（含新增 3 项 Safari 菜单能力检测 / 回退测试）与类型检查通过；本次 11/11 Chromium 浏览器回归通过（25.0s）；Chrome / Firefox / Safari 三目标构建通过。macOS 原生编译已通过，见下方结果。之前 23/23、11/11 是 0.1.0 的记录。


## 0.1.1 已执行的 macOS 原生编译

[macOS CI 成功](https://github.com/junedanglaotou/Xtag/actions/runs/39101383787)：macos-15、Xcode 16.4、MacOSX15.5 SDK，生成 Xcode 工程并编译 arm64 + x86_64 Universal Mac App 与 Safari .appex，xcodebuild 输出 BUILD SUCCEEDED。

[Ubuntu CI](https://github.com/junedanglaotou/Xtag/actions/runs/39101383771) 也通过。原生开发包已上传至 GitHub artifact：xtag-safari-macos-developer（ID 12126741213），内含 Mac App ZIP、Xcode 工程 ZIP、说明和 SHA-256 文件。已通过 GitHub API 确认 artifact 存在；本地下载返回 403，未在本地检查其中的二进制内容，不声称已完成本地哈希验证。

Mac App 使用 CODE_SIGNING_ALLOWED=NO 编译，没有 Apple 开发者签名和公证；未启动真实 Safari、未登录 X、未复现用户具体失败。此前“未转换 / 未编译”是 0.1.0 状态，不能将本次编译通过称为 Safari 运行通过。
