# 已知限制、失败和待完成事项

## 0.1.4 Safari 编码与正式安装状态

已修复后台 HTML 缺失编码声明和 Vite 8 / Rolldown 默认非 ASCII JS 引发的中文标签 / 错误提示解码问题。用户报告 Safari 0.1.3 手修版保存、刷新保留、主页历史和取消通过；本项目的 0.1.4 后台文件在 Chromium MV3 harness 中回归通过，不能把它写成 Safari 引擎验证。

工具栏「打开标签记录」已改原生链接，Chromium popup HTML 测试通过，真实 Safari 工具栏仍待手动复测。用户确认还没有 Apple Developer Program 会员，因此 Developer ID 签名、公证和 GitHub 长期安装包仍未完成。脚本和手动 CI 已准备，详见 SAFARI_DEVELOPER_ID.md。以下“未运行 Safari”的历史描述指本项目没有独立运行，而不是否定用户的本机实测反馈。

## 0.1.2 已确认并修复的真实页面问题

用户在 Arc 真实 X 上发现：普通时间 `<a role="link">` 被旧版 `EXCLUDED` 排除，所有帖子识别失败。补齐 fixture 的真实属性后，原代码有 7 项单元测试失败；修为 `[role="link"]:not(a)` 后 29 项单元和 11 项浏览器 fixture 测试通过。作者 / 头像 / 时间链接的浏览器 fixture 均已补上 role，quoteTweet、card.wrapper、非 anchor 的 link 容器和嵌套 article 仍排除。

这是此前测试 fixture 不充分造成的漏测，旧版“fixture 通过”不等于真实 X 可用。用户已报告 Arc 按钮和菜单恢复；其他真实浏览器的完整流程仍待验证。Safari 未完成安装是另一个独立问题。

## 使用边界

- 尚未在登录后的真实 x.com 上测试。For You / Following / 详情 / 搜索 / 主页使用相同 article 识别器；它们的真实 DOM 变体没有逐一验收。
- 仅在可靠识别外层 timestamp status 链接时注入。不明确、缺少时间链接、无法排除嵌套的帖子会跳过；推广、直播、特殊卡片、被删帖和某些锁定内容可能不显示按钮。引用卡片本身不单独注入标签按钮；打开引用原帖可独立标记。
- X 可随时改变 DOM。未知 DOM 的策略是跳过，不猜测 postId。fixture 不是完整的 X 页面快照。
- 没有可靠 X User ID 来源，因此正常页面以 handle 保存。handle 改名会拆分记录，复用可能使旧记录与新账号同名。该风险无法仅通过 handle 消除；本版本没有自动账号迁移。已有不同可靠 ID 绝不合并；同一 postId 才可提升身份。
- 稳定 ID 与 handle-only 记录在身份判断中分开，以免错误合并。手工导入带 ID 的记录可能不会出现在仅有 handle 的主页汇总中；全局历史仍可检索。
- 本地 IndexedDB，不加密、不跨设备同步。JSON 是明文。卸载、清理扩展数据或换配置可能丢失记录。需用户备份。
- 导入为补充合并：本机已有的 postId 保留。不提供覆盖恢复 / 全库清空。非法备份整批拒绝；大小上限 20MB、条数 100000。数万条以上记录的消息快照、筛选和性能尚未压测，不能据此承诺十万条顺畅。
- 摘要最多 1000 字符，不保存图片 / 视频 / 全文，不追踪帖子后续编辑或删除。
- 四个默认标签完整实现；自定义标签与云端登录 / 同步未实现。Repository 和 SyncAdapter 仅是扩展接口。
- 阴影样式与页面隔离，但定位依赖 X 布局。极窄屏、横屏、不同语言的长作者名、网页缩放及软键盘还需真机验收。
- 标签是私人判断，不是事实核查结果或 X 官方认证。

## 环境失败与修复记录

1. npm 初次安装被离线沙箱阻止；经授权联网安装成功。
2. Vitest 初次运行因 Windows 沙箱 EPERM 无法启动子进程；经授权运行成功。
3. WXT 将 `history` 入口自动配置成浏览器历史覆盖页；已改为普通 `records` 入口，打包检查拒绝任何 chrome_url_overrides。
4. 初始开发依赖的联网审计报告有 15 项漏洞；升级 WXT 0.21.4、Vitest 5.0.5 后联网审计为 0。
5. Playwright 默认管道和携带 load-extension 的启动方式在当前 Windows 环境超时；使用隔离测试配置、loopback CDP 端口及官方 Extensions.loadUnpacked API 成功加载扩展。未将启动失败记为功能通过。
6. 首轮浏览器测试重启场景读到上次的 DevToolsActivePort 文件；启动器已调整为重启前清理该临时文件，最终结果以 TEST_REPORT.md 为准。

## 未完成 / 未验证

- Edge、macOS Chrome、Firefox Desktop、所有 Android 真机、Safari macOS、iOS/iPadOS 尚未运行。
- Firefox 未取得 Mozilla 签名；正常永久安装和 Android 稳定版分发未完成。
- Safari 已在 macOS CI 生成 Xcode 工程并编译 Mac App，但未取得 Apple 开发者签名 / 公证，未做真实 Safari 加载验证；没有可直接安装的 iOS App。
- 所有商店审核未执行。没有自动发表任何 X 内容。
- GitHub Actions 首轮 Ubuntu 全流程已通过，后续提交状态以仓库 Actions 为准。


0.1.1 跟进：菜单不再无条件依赖 Safari 17 的 Popover API；已新增 macOS 原生 App 构建工作流并通过编译。没有获得 Apple 开发者签名 / 公证，也没有在用户真实 Safari 上复现。详情见 SAFARI_TROUBLESHOOTING.md。


### 0.1.1 原生构建结果更新

[macOS 原生 CI 已通过](https://github.com/junedanglaotou/Xtag/actions/runs/39101383787)。在该页面 Artifacts 下载 xtag-safari-macos-developer，其中含未签名 Universal Mac App 和 Xcode 工程。此结果更新此前“尚未运行 / 未转换 / 未编译”的描述。Apple 开发者签名、公证、真实 Safari 启用和真实 X 仍未验证。不要将这个开发包当作已签名的普通安装包。
