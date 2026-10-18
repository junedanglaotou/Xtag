#!/bin/bash
# Accept only a correctly exported Developer ID app; never sign with --deep.
set -euo pipefail
[[ $(uname -s) == Darwin ]] || { echo 'macOS is required for signature and Gatekeeper validation.' >&2; exit 1; }
: "${APPLE_TEAM_ID:?Set the expected Apple team ID}"
: "${XTAG_NOTARY_PROFILE:?Set a notarytool keychain profile}"
app=${1:-macos-release/export/XTag.app}
[[ -d $app/Contents/PlugIns ]] || { echo 'Missing app or embedded extension.' >&2; exit 1; }
expected_id=${XTAG_SAFARI_BUNDLE_ID:-com.xtag.private}
actual_id=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app/Contents/Info.plist")
[[ $actual_id == "$expected_id" ]] || { echo 'App bundle ID mismatch; stop to protect update identity.' >&2; exit 1; }
version=$(node -p "require('./package.json').version")
[[ $(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$app/Contents/Info.plist") == "$version" ]] || { echo 'Native app version does not match WebExtension version.' >&2; exit 1; }
verify_signature() {
  local info
  codesign --verify --strict --verbose=2 "$1"
  info=$(codesign --display --verbose=4 "$1" 2>&1)
  grep -q '^Authority=Developer ID Application:' <<< "$info"
  grep -Fxq "TeamIdentifier=$APPLE_TEAM_ID" <<< "$info"
  grep -q 'flags=.*runtime' <<< "$info"
}
verify_signature "$app"
found=false
for extension in "$app"/Contents/PlugIns/*.appex; do
  [[ -d $extension ]] || continue
  found=true; verify_signature "$extension"
done
[[ $found == true ]] || { echo 'Missing signed Safari extension.' >&2; exit 1; }
codesign --verify --deep --strict --verbose=2 "$app"
manifest=$(find "$app/Contents/PlugIns" -name manifest.json -print -quit)
[[ -n $manifest ]] || { echo 'Missing embedded WebExtension resources.' >&2; exit 1; }
for file in manifest.json background.js background-utf8.html content-scripts/content.js; do
  cmp "$(dirname "$manifest")/$file" ".output/safari-mv2/$file"
done
mkdir -p macos-release dist
input=$(mktemp -t xtag-notary).zip
trap 'rm -f "$input" "${input%.zip}"' EXIT
ditto -c -k --sequesterRsrc --keepParent "$app" "$input"
notary_auth=(--keychain-profile "$XTAG_NOTARY_PROFILE")
if [[ -n ${XTAG_NOTARY_KEYCHAIN:-} ]]; then notary_auth+=(--keychain "$XTAG_NOTARY_KEYCHAIN"); fi
xcrun notarytool submit "$input" "${notary_auth[@]}" --wait --output-format json > macos-release/notarization.json
node --input-type=module -e 'import fs from "node:fs"; const r=JSON.parse(fs.readFileSync("macos-release/notarization.json","utf8")); if(r.status!=="Accepted")throw Error("Apple notarization was not Accepted; no release artifact created. Submission: "+r.id);'
xcrun stapler staple "$app"
xcrun stapler validate "$app"
codesign --verify --deep --strict --verbose=2 "$app"
spctl --assess --type execute --verbose=2 "$app"
output="dist/xtag-$version-macos-developer-id.zip"
ditto -c -k --sequesterRsrc --keepParent "$app" "$output"
shasum -a 256 "$output" > "$output.sha256"
echo "Signature, notarization, stapled ticket and Gatekeeper checks passed: $output"
