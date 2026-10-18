# 兼容性与安装边界

状态日期：2026-10-18。构建成功、桌面尺寸模拟和真机验证是不同的状态。

| 平台 | 可交付内容 | 验证状态 |
| --- | --- | --- |
| Windows Chrome | Chrome MV3 目录和 ZIP，可开发者模式加载 | Windows Chrome for Testing 156 + 真实扩展 + DOM fixtures；真实 X 未验证 |
| Windows Edge | 同一个 Chrome MV3 目录 | 已构建，未在 Edge 加载运行 |
| macOS Chrome | 同一个 Chrome MV3 目录 | 未在 macOS 运行 |
| Firefox Desktop | Firefox MV2 目录和未签名 XPI；最低 140 | 已构建；未运行 Firefox；正常发行需要 AMO 签名 |
| Android Firefox | 同一 Firefox 源构建；最低 142 | 未做真机安装；正常安装待签名 / AMO 分发 |
| Android 支持 WebExtension 的 Chromium | Chrome MV3 构建候选 | 未确认任何第三方浏览器支持；必须逐一安装验收 |
| Android 官方 Chrome | 无普通扩展安装产物 | 不能默认支持普通 Chrome Extension；Desktop Site 不改变这一点 |
| Android Desktop Site | 980×800 布局 fixture 场景 | 仅桌面浏览器视口模拟；未做 Android 真机测试 |
| macOS Safari | Safari MV2 WebExtension 源构建及转换脚本 | 无 macOS / Xcode，未转换、未签名、未运行 |
| iPhone / iPad Safari | 同一源构建供 Xcode 转换 | 未生成可安装 App，无设备测试，无签名 |

## Firefox 桌面

开发时在 `about:debugging#/runtime/this-firefox` 选择解压后的 manifest.json 临时载入。临时附加组件不是永久安装方案；请先备份，勿假设临时测试配置可以长期保存数据。

长期分发：用 Mozilla 开发者账号上传源码与可复现构建，申请 AMO 上架或未上架签名；签名成功后再把返回的签名 XPI 提供给用户。本项目的 `unsigned.xpi` 没有 Mozilla 签名，未提交 AMO。

官方说明：[临时安装](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/)、[签名与分发](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)。

## Android Firefox

普通用户：等待 Mozilla 签名 / AMO 发行版本，再从 Firefox 支持的扩展安装入口安装。本版本不声称未签名 XPI 可以直接装到 Android Firefox 稳定版。

开发者真机验收（本环境未执行）：

1. 在测试设备安装当前 Firefox Android，启用 USB 调试和 Firefox 远程调试；电脑准备 ADB。
2. 使用 Mozilla `web-ext` 官方工具，先 `adb devices` 确认自己设备处于 authorized。
3. 在项目中运行 `npx web-ext run --source-dir .output/firefox-mv2 --target firefox-android --android-device <设备ID> --firefox-apk org.mozilla.firefox`。目标包名根据稳定版 / Beta / Nightly 调整。工具和参数应按安装时官方文档复核。
4. 在 Firefox 自己登录 X；按 README 验收。远程开发会话和临时加载不代替签名发行。

官方指南：[Developing extensions for Firefox for Android](https://extensionworkshop.com/documentation/develop/developing-extensions-for-firefox-for-android/)。

## Android Chromium 与 Desktop Site

未测试 Kiwi、Yandex、Edge Android 或其他第三方浏览器的当前扩展支持。不得因它们使用 Chromium 就列为已支持。

逐个验证：记录浏览器名称 / 版本 / Android 版本 → 确认它提供普通 WebExtension 安装入口与 MV3 支持 → 安装 Chrome 构建 → 给 x.com 授权 → 先在移动模式跑 README 验收 → 再请求 Desktop Site 重复。任一阶段失败，记录失败原因而非跳过。

Desktop Site 的网页 viewport 可能约 980px，扩展会按实际布局宽度使用桌面放置策略。视口模拟不模拟 Android 扩展进程、软键盘、触控硬件或系统安装限制。

## Safari macOS / iOS

本项目只产出可供转换的 WebExtension 文件。Windows 无法提供真实 Xcode 工程构建、Apple 签名 App、IPA、TestFlight 或 App Store 审核结果。

在有 Xcode 的 Mac 上：

```sh
npm ci
npm run build:safari
sh scripts/convert-safari.sh
```

或运行 `xcrun safari-web-extension-converter .output/safari-mv2 --project-location safari-project --app-name XTag --bundle-identifier com.xtag.private`。实际转换警告需逐项处理。

在 Xcode 中选择自己的 Team、唯一 bundle ID 和 macOS / iOS target；运行容器 App；在 Safari 扩展设置里启用 XTag，并授权 x.com。iOS 真机要选择连接设备及适当签名配置。公开发行通常需要 Apple 开发者环境和 App Store / TestFlight 流程。未声明本版本已具备这些产物。

使用 popover / dialog 顶层 UI；Safari 需支持相应 Web API（建议 17+），最低系统版本须在 Xcode 与真机验证后确定。未执行旧版 Safari 回退测试。

官方流程：[Converting a web extension for Safari](https://developer.apple.com/documentation/safariservices/converting-a-web-extension-for-safari)。


0.1.1 Safari 修复进度：已新增菜单 API 回退、兼容新旧 Xcode 打包工具及 macOS 容器 App 编译工作流。该工作流尚待首次运行；此前表格的“未转换 / 未编译”是 0.1.0 状态。详见 SAFARI_TROUBLESHOOTING.md。真实 Safari 故障仍在收集版本和失败步骤。
