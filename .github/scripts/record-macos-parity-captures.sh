#!/usr/bin/env bash
# Export parity PNGs from NativeParityCaptureTests (PARITY_CAPTURE=1).
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
OUT="${PARITY_OUTPUT_DIR:-$ROOT/build/desktop-parity/macos}"
# XCTest runs sandboxed; /tmp is writable from the UI test runner (repo build/ is not).
STAGING="${PARITY_STAGING_DIR:-/tmp/compass-parity-captures}"
mkdir -p "$STAGING" "$OUT"
cd "$ROOT/apps/calendar-macos"

if ! command -v xcodegen >/dev/null 2>&1; then
  echo "xcodegen is required" >&2
  exit 1
fi

bash "$ROOT/.github/scripts/render-macos-icon.sh"
xcodegen generate

# UI test runners do not inherit shell exports; launchctl setenv reaches XCTest.
launchctl setenv PARITY_CAPTURE 1
launchctl setenv PARITY_OUTPUT_DIR "$STAGING"
cleanup_env() {
  launchctl unsetenv PARITY_CAPTURE 2>/dev/null || true
  launchctl unsetenv PARITY_OUTPUT_DIR 2>/dev/null || true
}
trap cleanup_env EXIT

xcodebuild test \
  -project Compass.xcodeproj \
  -scheme Compass \
  -destination platform=macOS \
  -derivedDataPath build/DerivedData \
  -clonedSourcePackagesDirPath build/SourcePackages \
  -resultBundlePath build/ParityCapture.xcresult \
  -only-testing:CompassUITests/NativeParityCaptureTests/testExportParitySurfaces

png_count=$(find "$STAGING" -maxdepth 1 -name '*.png' 2>/dev/null | wc -l | tr -d ' ')
if [ "${png_count:-0}" -lt 1 ]; then
  echo "No parity PNGs in ${STAGING} (did the capture test skip?)" >&2
  exit 1
fi

cp "$STAGING"/*.png "$OUT/"
echo "Parity PNGs written to ${OUT} (${png_count} files, staged in ${STAGING})"
