#!/bin/sh
set -eu
# Run on macOS after npm ci && npm run build:safari. Requires Xcode command-line tools.
xcrun safari-web-extension-converter .output/safari-mv2 --project-location safari-project --app-name XTag --bundle-identifier com.xtag.private --no-open
echo 'Open safari-project in Xcode; select your team, macOS / iOS target and signing profile.'
