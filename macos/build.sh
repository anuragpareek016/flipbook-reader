#!/usr/bin/env zsh
set -euo pipefail

DEVELOPER_ROOT="${DEVELOPER_ROOT:-/Users/openfrontierlabs/Developer}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="${1:-$DEVELOPER_ROOT/apps/FlipBook Reader.app}"
ICONSET="$(mktemp -d)/FlipBookIcon.iconset"

mkdir -p "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources" "$ICONSET"
cp "$SCRIPT_DIR/Info.plist" "$APP_DIR/Contents/Info.plist"

swift "$SCRIPT_DIR/make_icon.swift" "$ICONSET"
iconutil -c icns "$ICONSET" -o "$APP_DIR/Contents/Resources/FlipBookIcon.icns"
rm -rf "$(dirname "$ICONSET")"

swiftc -O -framework AppKit -framework WebKit "$SCRIPT_DIR/FlipBookReader.swift" -o "$APP_DIR/Contents/MacOS/FlipBookReader"
codesign --force --deep --sign - "$APP_DIR"
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP_DIR"

echo "Built $APP_DIR"
