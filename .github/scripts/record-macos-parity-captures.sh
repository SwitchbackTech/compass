#!/usr/bin/env bash
# Export parity PNGs from NativeParityCaptureTests (PARITY_CAPTURE=1).
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
OUT="${PARITY_OUTPUT_DIR:-$ROOT/build/desktop-parity/macos}"
mkdir -p "$OUT"
cd "$ROOT/apps/calendar-macos"

if ! command -v xcodegen >/dev/null 2>&1; then
  echo "xcodegen is required" >&2
  exit 1
fi

bash "$ROOT/.github/scripts/render-macos-icon.sh"
xcodegen generate

export PARITY_CAPTURE=1
export PARITY_OUTPUT_DIR="$OUT"
xcodebuild test \
  -project Compass.xcodeproj \
  -scheme Compass \
  -destination platform=macOS \
  -derivedDataPath build/DerivedData \
  -clonedSourcePackagesDirPath build/SourcePackages \
  -resultBundlePath build/ParityCapture.xcresult \
  -only-testing:CompassUITests/NativeParityCaptureTests/testExportParitySurfaces

echo "Parity PNGs written to ${PARITY_OUTPUT_DIR}"
