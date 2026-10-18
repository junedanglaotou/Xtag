#!/bin/bash
# Run on a Mac with a Developer ID Application certificate/private key installed.
set -euo pipefail
[[ $(uname -s) == Darwin ]] || { echo 'A macOS signing environment is required.' >&2; exit 1; }
: "${APPLE_TEAM_ID:?Set APPLE_TEAM_ID to your Apple developer team}"
: "${XTAG_BUILD_NUMBER:?Set a new increasing integer build number}"
[[ $APPLE_TEAM_ID =~ ^[A-Z0-9]{10}$ ]] || { echo 'Invalid Apple team ID.' >&2; exit 1; }
[[ $XTAG_BUILD_NUMBER =~ ^[1-9][0-9]*$ ]] || { echo 'Invalid build number.' >&2; exit 1; }
project=${XTAG_SAFARI_PROJECT:-$(find safari-project -name '*.xcodeproj' -type d -print -quit)}
[[ -d $project ]] || { echo 'Generate the Safari Xcode project first.' >&2; exit 1; }
version=$(node -p "require('./package.json').version")
mkdir -p macos-release
auth=(-allowProvisioningUpdates)
if [[ -n ${APPLE_API_KEY_PATH:-} ]]; then
  : "${APPLE_API_KEY_ID:?Set the API key ID}"
  : "${APPLE_API_ISSUER_ID:?Set the API issuer ID}"
  auth+=(-authenticationKeyPath "$APPLE_API_KEY_PATH" -authenticationKeyID "$APPLE_API_KEY_ID" -authenticationKeyIssuerID "$APPLE_API_ISSUER_ID")
fi
xcodebuild -project "$project" -scheme XTag -configuration Release \
  -destination 'generic/platform=macOS' -archivePath macos-release/XTag.xcarchive \
  "${auth[@]}" \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" CODE_SIGN_STYLE=Automatic \
  CODE_SIGN_IDENTITY='Developer ID Application' ENABLE_HARDENED_RUNTIME=YES \
  MARKETING_VERSION="$version" CURRENT_PROJECT_VERSION="$XTAG_BUILD_NUMBER" \
  MACOSX_DEPLOYMENT_TARGET=12.0 ARCHS='arm64 x86_64' ONLY_ACTIVE_ARCH=NO archive
cat > macos-release/ExportOptions.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>method</key><string>developer-id</string><key>signingStyle</key><string>automatic</string><key>teamID</key><string>$APPLE_TEAM_ID</string></dict></plist>
EOF
xcodebuild -exportArchive -archivePath macos-release/XTag.xcarchive \
  -exportPath macos-release/export -exportOptionsPlist macos-release/ExportOptions.plist \
  "${auth[@]}"
echo 'Developer ID export created. It is not a finished distribution until notarization passes.'
