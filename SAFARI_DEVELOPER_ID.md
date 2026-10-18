# Safari GitHub 下载版：Developer ID 签名与公证

日期：2026-10-18。用户优先选择 macOS GitHub 下载版。Apple 明确支持在 Mac App Store 外分发 Developer ID 签名、公证的 Safari WebExtension 容器 App。本项目**尚无用户的 Apple Developer Program 会员、证书或公证凭据**；以下流程已实现但尚未执行签名、公证，不能将现有 unsigned App 当作正式长期安装版。

官方依据：[Safari 正式分发](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension)、[公证自定义流程](https://developer.apple.com/documentation/security/customizing-the-notarization-workflow)、[Apple 会员 US$99 / 年及地区价格](https://developer.apple.com/programs/enroll/)。GitHub 下载版仍需要 Apple 会员与 Developer ID；不通过 App Store 审核不等于免签名 / 免公证。iOS 不适用这个 Mac 下载方式。

## 当前修复

0.1.4 使用显式 `background-utf8.html`，在脚本前声明 UTF-8，并通过 Rolldown `output.charset: ascii` 转义非 ASCII JavaScript。MV2 manifest 指向该后台页面，Chrome MV3 保留 service worker。`npm run check:builds` 和打包均检查编码及权限；Mac 原生构建逐字节核对内嵌 manifest、background.js、background-utf8.html、content.js。

用户报告其本机 0.1.3 手工修复后，Safari 实际 X 可保存、刷新保留、主页查历史及取消；此为用户实测，本项目没有独立登录复核。0.1.4 工具栏入口改为原生链接；Chromium popup HTML 点击新标签页已回归，但实际 Safari 工具栏弹窗仍需人工确认。

## 一次性账号与身份准备

1. 用户自己注册并完成 Apple Developer Program 付费会员。只注册免费 Apple Account 不够。
2. 为发布者的团队创建 **Developer ID Application** 证书，确保 Mac 钥匙串中含配套私钥。Mac App Store / Apple Development 证书不能替代。
3. 在同一团队下确定长期使用的容器 App 与 Safari 扩展 Bundle ID。现有转换脚本默认容器 `com.xtag.private`，可用 `XTAG_SAFARI_BUNDLE_ID` 指定正式身份。该 ID 尚未在用户团队注册或核验；首次正式发布确定后永久沿用，并记录转换工程实际的扩展 Bundle ID。
4. 若 Xcode 提示需要 provisioning profiles / capabilities，在该团队下完成匹配 App 与内嵌扩展的配置。用 Xcode 完成签名，不用 `codesign --deep` 草率重新签名整个 App。
5. 为 notarytool 配置钥匙串凭据。可用团队 App Store Connect API key，或本机 Apple Account 的应用专用密码；具体账号配置以 Apple 流程为准。不在聊天、仓库或普通 artifacts 中存放证书私钥、p12 密码、p8 或应用专用密码。

## 本地 Mac 执行

在装有完整 Xcode、Developer ID 证书、登录了相应团队的 Mac 上执行：

```sh
npm ci
npm run typecheck
npm test
npm run build:safari
node scripts/check-builds.mjs safari
export APPLE_TEAM_ID='替换成10位团队ID'
export XTAG_SAFARI_BUNDLE_ID='替换成确定的长期容器ID'
export XTAG_BUILD_NUMBER='1' # 后续发布递增
sh scripts/convert-safari.sh --macos-only
bash scripts/archive-safari-developer-id.sh
```

归档脚本用 Xcode archive / exportArchive 的 developer-id 分发方法导出 App，启用 Hardened Runtime，保留内嵌扩展的签名 / entitlements。首次团队配置可能仍需在 Xcode 处理签名配置错误；脚本尚未用真实账号执行，不承诺首次免配置成功。

通过交互式 `xcrun notarytool store-credentials XTagNotary` 把凭据存进自己 Mac 的钥匙串（按提示输入，不在脚本中硬编码）。然后：

```sh
export XTAG_NOTARY_PROFILE='XTagNotary'
bash scripts/notarize-safari-macos.sh
```

公证脚本依次执行：App 身份 / 版本核对 → App 与每个 appex 的 Developer ID、团队、Hardened Runtime 和签名检查 → 内嵌代码与构建逐字节比对 → notarytool 等待 Accepted → staple / validate → 再验签 → Gatekeeper spctl 验证 → 最后生成 `dist/xtag-版本-macos-developer-id.zip` 和 SHA256。任何一步失败都不会创建本次最终发布 ZIP。若相同版本已有旧发布 ZIP，应按构建日志确认，不将遗留文件当作本次成功。

## GitHub Actions 手动流程

工作流：`.github/workflows/safari-developer-id.yml`。仅手动运行，不在 push 时自动消耗 Apple 凭据，也不自动公开发布 GitHub Release。

在 GitHub 配置名为 `safari-release` 的 Environment，建议启用 required reviewers 和主分支限制。配置以下 Environment Secrets：

| Secret | 内容 |
| --- | --- |
| DEVELOPER_ID_P12_BASE64 | Developer ID Application 证书及私钥的 p12 文件，base64 编码 |
| DEVELOPER_ID_P12_PASSWORD | 该 p12 的导出密码 |
| APPLE_API_KEY_BASE64 | 团队 App Store Connect API 私钥 p8 的 base64 |
| APPLE_API_KEY_ID | 该 API key 的 Key ID |
| APPLE_API_ISSUER_ID | Issuer ID |

API key 需具备相应 Xcode 自动签名 / 配置及公证权限。操作员在 dispatch 中填写 Team ID 和固定 Bundle ID。流程会将证书导入 runner 临时钥匙串、配置公证凭据、构建归档、签名导出、公证与校验；无凭据时在导入前停止。临时签名文件和钥匙串在 always 步骤清理，仅全部校验通过后上传 `xtag-safari-developer-id-notarized` artifact。

目前这项签名工作流没有运行。现有 `Safari macOS developer build` 工作流只编译未签名 App；它通过不代表签名 / 公证工作流通过。

## 最终用户安装和升级

签名公证完成后，从 GitHub 下载最终 ZIP，解压把 XTag.app 放进固定的 Applications 目录，打开一次，然后在 Safari 扩展设置启用并授权 x.com。不是「添加临时扩展」，不要求反复允许未签名扩展；首次 Safari 启用和站点权限仍需要用户操作。

发布前必须在正常安全设置的真实 Mac 验收：下载触发正常 quarantine → 解压、打开 App、启用 → 中文四标签保存 / 刷新 / 历史 / 取消 → 退出重开 Safari及重启 Mac → 工具栏链接 → 同 Team / Bundle IDs 的下一构建覆盖原 App并验证原记录。未执行这些验收前不宣称长期安装已经验证。

临时扩展切正式 App 可能更换扩展身份，**先在现有临时扩展导出 JSON**，安装正式版后导入并核对。不跨身份自动读取另一扩展的数据。后续保持同一 Team / Bundle IDs，在原位置替换 App，不能先卸载清数据。GitHub ZIP 本身不提供自动更新，本次没有加入 Sparkle 或其他自动更新器；用户下载新 App覆盖更新。相关说明见 RELEASE_AND_UPDATES.md。
