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
