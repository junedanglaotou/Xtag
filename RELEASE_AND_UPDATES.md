# XTag 正式发布、费用与保留记录更新

核实日期：2026-10-18。当前仍是 0.1.4 开发测试版本，没有任何商店上架或审核通过记录。用户本人使用桌面 Chrome，Safari 由其他人测试，安装方式尚未确认。

## 费用

| 项目 | 平台费用 | 说明 |
| --- | --- | --- |
| 当前 Chrome 本地开发者模式 | US$0 | 更新时保留同一个扩展目录、ID 和浏览器配置 |
| Chrome Web Store 开发者注册 | US$5，一次性 | 不是每次更新收费；实际付款以注册页面为准 |
| Apple Developer Program | US$99 / 会员年 | 同一个会员可发布 macOS / iOS Safari 扩展；地区价格在注册时显示，不能直接当作马币报价 |
| Edge Add-ons | 注册提交免费 | 仍需账号验证与扩展审核 |
| Firefox AMO | 无注册 / 签名发布费 | 仍需账号、签名及审核 |
| 本地保存需要的服务器 / 云数据库 | US$0 | 当前功能不使用云服务；跨设备同步另行设计和计费 |

Chrome 与 Safari 都发布的基本平台预算：按美元标价首年 US$104，之后 Apple US$99 / 年；地区定价、税费和付款换汇按实际账单。这里不是外包开发报价，也不包含未来可选的域名、额外云计算或云同步支出。不需要为当前本地存储功能购买服务器。

官方来源：[Chrome 一次性注册](https://developer.chrome.com/docs/webstore/register)、[Google 明确 US$5](https://developer.chrome.com/blog/cws-role-expansion-developer-dashboard)、[Apple 会员及地区定价](https://developer.apple.com/programs/enroll/)、[Edge 免费注册提交](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/create-dev-account)、[Firefox 提交与签名](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)。

## 现有 Chrome 用户：更新时保留数据

版本号不是数据库名称。XTag 始终使用扩展自己的 IndexedDB `xtag-v1`；从数据库版本 1 升到 2 时，仅将「未知」改为「没用」，保留记录元数据和时间。

1. 在旧扩展的「标签记录」中先点「导出全部 JSON」，确认备份文件内 records 有记录。备份留在自己电脑，不用发给开发者。
2. 在 chrome://extensions 记下旧 XTag 的扩展 ID，并确认其原来的加载目录。若有多个 XTag，分别打开历史页检查，不要先移除任何一个。
3. 把新版 ZIP 解压到临时目录，再将其内容覆盖进**原来的固定扩展目录**，manifest.json 仍放在原位置。不要每个版本换一个新目录再点「加载已解压的扩展」。
4. 在原 XTag 那张卡片上点「重新加载」，核对 ID 没变，再刷新 X 页面。
5. 检查历史记录数量和标签。不卸载、不清理扩展数据、不换 Chrome 用户配置。

若新版显示空白：先禁用新版的重复条目，在原 Chrome 配置 / 原扩展中检查历史；旧数据可能仍在那里，但本项目尚未检查用户电脑，不能保证可恢复。若找到记录，导出后在目标版本导入。若旧扩展已被卸载或其数据被清除且没有备份，不能承诺找回。

## Safari：正式安装与临时测试

当前优先选择 macOS GitHub 下载版：Developer ID Application 签名容器与内嵌扩展 → Apple notarization → staple / Gatekeeper 校验 → GitHub 分发。该路径同样需要 Apple 付费会员；尚无会员和证书，因此没有正式签名产物。完整准备流程见 [SAFARI_DEVELOPER_ID.md](SAFARI_DEVELOPER_ID.md)。它不会自动通过 App Store 更新；下载新版 App 覆盖原位置，保持原身份。下述两种是其他发布路径。

临时添加文件夹不等于正式安装。Apple 的当前文档说明，Safari 的临时扩展会在退出 Safari 或 24 小时后移除。因此临时目录测试不能承担长期记录保存。测试者若还有记录，先导出 JSON，再切换正式安装。

当前有两条官方发布路径：

1. **App Store Connect 网页打包**：付费开发者账号创建 XTag app 记录 → Xcode Cloud 页的 Safari Web Extension Packager 上传 `dist/xtag-0.1.4-safari-webextension.zip` → 处理打包警告 → TestFlight 真机测试 → 补齐商店材料 → 提交 App Store 审核。此路径不要求本地 Mac / Xcode；具体账号入口需登录后确认。上传 ZIP 不等于审核成功。
2. **Xcode 原生工程**：现有 macOS CI 可生成未签名 App 和工程；在自己的 Apple Team 下完成签名、归档和 App Store Connect 上传。需要自定义原生功能时用这条路径。

正式发布后，后续构建上传到**同一个 App Store Connect app 记录**，保持容器 App 与扩展的 Bundle ID、开发团队身份不变，递增版本和构建号。用户通过 App Store 更新原 App，无需卸载重装。当前脚本的开发用容器 ID 为 `com.xtag.private`；正式账号下是否可注册尚未核验，不能把它当作已经保留的商店身份。不能每次生成新商店条目或新 Bundle ID。

临时扩展转正式版，或现有身份与商店身份不同，按一次性 JSON 导出 / 导入迁移；不宣称 Safari 自动搬运不同扩展身份的数据。App Store 更新也不等于标签跨设备同步，目前数据仍在各浏览器本机。

官方来源：[Safari 运行、临时扩展与更新](https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension)、[网页打包及发布](https://developer.apple.com/documentation/safariservices/packaging-and-distributing-safari-web-extensions-with-app-store-connect)、[Safari 分发](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension)。

## Chrome 正式发布身份

创建一个 Chrome Web Store 草稿条目后，保留它的 item ID。以后使用该条目的 Upload New Package 更新，不反复创建新条目。可以按 Google 文档获取草稿的公开 key，使未来开发包与商店包使用相同 ID；公开 key 不是私钥。

当前开发者模式安装没有设置商店 key。直接补一个新 key 可能改变用户现有 ID，因此本次没有擅自改动 manifest 身份。当前本地用户转商店版时，先备份，再在目标商店版导入并核对记录。不要承诺不同 ID 自动共享 IndexedDB。

官方来源：[保持一致的扩展 ID](https://developer.chrome.com/docs/extensions/reference/manifest/key)、[更新原商店条目](https://developer.chrome.com/docs/webstore/update)。

## 提交材料草稿与待办

- 名称：XTag。
- 简介：为 X 帖子添加私人标签，在本机回看与管理历史记录。
- 描述：为每条帖子独立选择有用、谣言、没用、高质；查看博主累计分类和历史原帖，搜索、修改和取消标记；支持 JSON 备份恢复。分类仅代表用户私人判断，不是 X 官方评级。不自动发帖或读取密码、Cookie，不上传标签。
- 审核操作：Safari 启用扩展并允许 x.com → 使用测试者自己的 X 登录 → 标记两条帖子 → 打开博主标签记录 → 编辑与取消 → 退出重开验证 → 导出备份 → 同身份安装下一测试构建验证保留。
- 隐私文案基础：PRIVACY.md。公开隐私政策 URL、支持 URL 和联系信息仍需发布者确认。
- 仍需发布者账号、身份验证 / 付款和平台协议；不能由代码代替。
- 仍需商店图标与合规尺寸截图、真实 Safari 测试、隐私 / 年龄分级 / 地区与定价表单。Fixture 截图不能冒充真实 Safari 截图。本文件是准备材料，不是已经完成的提审包。

## 本次新增更新测试的边界

`tests/e2e/upgrade.spec.ts` 使用真实 Chromium 扩展：旧 schema fixture（manifest 0.1.2、IndexedDB v1）写入旧标签 → 关闭浏览器 → 在原目录覆盖当前生产构建 → 用同一浏览器配置加载，断言 ID 不变、旧标签迁移、记录和时间完整、计数正确 → 导出核对 → 再重启验证。

这是旧数据结构的更新回归；旧 fixture 不是历史 0.1.2 原始生产二进制，也不是 Safari / App Store 更新实测。Safari 正式版须另做相同两构建升级验收。
