# 政策检查记录

2026-10-18 阅读了以下官方资料。本记录是实现选择与发布待办，不代表 X 或扩展商店已经审核、认可或保证上架。

| 资料 | 本版本采取的措施 / 待办 |
| --- | --- |
| [X Developer Policy](https://docs.x.com/developer-terms/policy) | 不使用 API，不做平台自动化、不进行批量采集或公开评级。只在用户操作后保存本机个人笔记。X 内容使用仍可能涉及其条款，上架或扩大用途前需重新审查；本文不声称取得 X 许可。 |
| [Chrome Web Store 政策](https://developer.chrome.com/docs/webstore/program-policies/policies) | 仅 storage 权限及 X 域名内容脚本。全部代码打包，未引入远程可执行代码；附隐私声明。发布时需填写数据披露、单一用途、权限说明和开发者联系信息。 |
| [Mozilla Add-on Policies](https://extensionworkshop.com/documentation/publish/add-on-policies/) | 无数据传输，提供可复现构建源码，不混淆。Firefox manifest 声明 data_collection_permissions.required = [none]。仍需 AMO 签名审核。 |
| [Firefox 内置数据同意机制](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/) | Firefox 桌面最低 140，Android 最低 142；不收集或传输到浏览器以外。 |
| [Apple Safari WebExtension 转换](https://developer.apple.com/documentation/safariservices/converting-a-web-extension-for-safari) | 交付转换用 WebExtension 源构建和 macOS 脚本；本 Windows 环境无法运行 Xcode 或验证签名。App Store 隐私填写及审核仍待完成。 |

尚未提交 Chrome Web Store、Edge Add-ons、AMO 或 App Store；没有任何商店审核通过结论。
