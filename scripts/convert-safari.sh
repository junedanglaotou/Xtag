#!/bin/sh
set -eu
# Full Xcode is required on macOS; support both old and current tool names.
if xcrun --find safari-web-extension-packager >/dev/null 2>&1; then
  tool=safari-web-extension-packager
elif xcrun --find safari-web-extension-converter >/dev/null 2>&1; then
  tool=safari-web-extension-converter
else
  echo 'Safari packager not found. Install and select full Xcode on a Mac.' >&2
  exit 1
fi
xcrun "$tool" .output/safari-mv2 \
  --project-location "${XTAG_SAFARI_PROJECT_DIR:-safari-project}" \
  --app-name XTag --bundle-identifier "${XTAG_SAFARI_BUNDLE_ID:-com.xtag.private}" \
  --swift --copy-resources --no-open --no-prompt "$@"
echo 'Xcode project generated. This is not yet a signed or notarized installable app.'
