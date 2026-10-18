# Safari 使用故障排查（0.1.2）

0.1.2 已修复共享帖子识别器误排除普通 `<a role="link">` 的问题。已安装的旧 Safari 构建同样可能受影响，需重新构建 / 打包更新后的资源。用户截图显示此前 Safari 尚未安装完成，因此不能把 Arc 发现的 DOM 错误当作 Safari 已经实测的运行故障；安装、签名与站点授权仍需分开确认。

这份记录区分原生 App 打包、Safari 启用、x.com 授权和页面功能。构建成功不等于真实 Safari 验证通过。

## 先确认失败位置

请提供 macOS 版本、Safari →「关于 Safari」中的版本，以及以下哪一项失败：

- ZIP 无法安装，或 Safari 的扩展设置找不到 XTag。
- 已启用 XTag 并允许 x.com，但帖子没有按钮。
- 有按钮，但菜单、标签保存或历史面板失败。

可提供报错文字或相关截图，不需要密码、Cookie 或 Apple 证书私钥。

## Safari 27 临时测试（不需要 Xcode）

Apple 在 Safari 27 的开发者流程中提供了临时加载扩展资源目录的入口：

1. 解压 Safari WebExtension 源包，找到直接含 manifest.json 的目录。
2. Safari 设置 → 高级 → 显示面向网页开发者的功能。
3. 在开发者设置中使用「添加临时扩展」，按 Safari 的提示处理本地开发扩展，再选择资源目录。
4. 在扩展设置中启用 XTag，只允许访问 x.com / twitter.com，然后刷新页面。

这是开发测试入口，不是签名发行或永久安装。若没有该入口，请不要套用到旧版 Safari。

官方演示：[Apple WWDC26: Create web extensions for Safari](https://developer.apple.com/videos/play/wwdc2026/216/)

## 需要 Xcode 容器 App 的安装路径

旧版 Safari 通常需要一个包含扩展的 macOS App。原先交付的 WebExtension ZIP 不是这种 App。

```sh
npm ci
npm run build:safari
sh scripts/convert-safari.sh --macos-only
```

脚本同时支持当前 safari-web-extension-packager 和旧名 safari-web-extension-converter，并明确创建 Swift 项目、复制资源、关闭交互确认。使用完整 Xcode 打开生成项目，选择 macOS target 和自己的开发签名，然后 Build / Run。运行容器 App 后再进入 Safari 扩展设置启用并授权 x.com。

官方流程：[Apple Safari 打包说明](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari)

## macOS CI 产物

新增工作流 Safari macOS developer build 会尝试在 GitHub 的 macos-15 runner 上生成 Xcode 工程，并编译包含原生扩展的 Universal macOS App。

只有该次运行成功，才能说已完成真实 macOS 编译。输出 App 没有 Apple 开发者签名和公证，仅供开发测试；不保证下载后可以直接打开。macOS 如果拒绝这个未签名 App，请使用一同提供的 Xcode 工程，在自己的 Mac 上选择开发签名构建。不要关闭 Gatekeeper 或系统安全检查。

这项流水线不自动修改 Safari 安全设置、不登录 X，也不声称完成了真实 x.com 验证。正式顺畅安装仍需要合适的 Apple 签名 / 分发流程。

## 本次确认的代码问题

0.1.0 直接调用 showPopover / hidePopover，并查询 :popover-open。Popover 是 Safari 17 新增 API，较早版本可能在打开菜单时抛错。0.1.1 改成能力检测：原生 API 可用时使用顶层菜单；缺失或调用失败时改用独立固定浮层。浮层位于 X 容器之外，避免被帖子 overflow 裁剪。

新增三项回归测试覆盖：API 缺失、原生模式和原生打开失败后的回退。这是代码兼容修复，不代表已经定位到你这次故障的根因；仍需结合你的版本与失败步骤判断。


### 0.1.1 原生构建结果更新

[macOS 原生 CI 已通过](https://github.com/junedanglaotou/Xtag/actions/runs/39101383787)。在该页面 Artifacts 下载 xtag-safari-macos-developer，其中含未签名 Universal Mac App 和 Xcode 工程。此结果更新此前“尚未运行 / 未转换 / 未编译”的描述。Apple 开发者签名、公证、真实 Safari 启用和真实 X 仍未验证。不要将这个开发包当作已签名的普通安装包。
