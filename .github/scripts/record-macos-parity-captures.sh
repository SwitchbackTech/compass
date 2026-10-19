#!/usr/bin/env bash
# Export parity PNGs from NativeParityCaptureTests (PARITY_CAPTURE=1).
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
OUT="${PARITY_OUTPUT_DIR:-$ROOT/build/desktop-parity/macos}"
SURFACES=(week-grid mini-calendar event-form command-palette settings onboarding-welcome)
mkdir -p "$OUT"
cd "$ROOT/apps/calendar-macos"

if ! command -v xcodegen >/dev/null 2>&1; then
  echo "xcodegen is required" >&2
  exit 1
fi

bash "$ROOT/.github/scripts/render-macos-icon.sh"
xcodegen generate

# UI test runners do not inherit shell exports; launchctl setenv reaches XCTest.
launchctl setenv PARITY_CAPTURE 1
cleanup_env() {
  launchctl unsetenv PARITY_CAPTURE 2>/dev/null || true
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

REF_DIR=$(find "$ROOT/apps/calendar-macos/build/DerivedData/Build/Products" -type d -path '*CompassUITests.xctest/Contents/Resources/ReferenceImages' 2>/dev/null | head -1)
if [ -z "${REF_DIR:-}" ] || [ ! -d "$REF_DIR" ]; then
  echo "Could not find CompassUITests ReferenceImages output under DerivedData" >&2
  exit 1
fi

copied=0
for name in "${SURFACES[@]}"; do
  if [ -f "$REF_DIR/$name.png" ]; then
    cp "$REF_DIR/$name.png" "$OUT/"
    copied=$((copied + 1))
  else
    echo "Missing parity PNG: $REF_DIR/$name.png" >&2
  fi
done

if [ "$copied" -lt "${#SURFACES[@]}" ]; then
  echo "Expected ${#SURFACES[@]} parity PNGs, copied $copied" >&2
  exit 1
fi

echo "Parity PNGs written to ${OUT} (${copied} files, from ${REF_DIR})"
