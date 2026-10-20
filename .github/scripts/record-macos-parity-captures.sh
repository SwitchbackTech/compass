#!/usr/bin/env bash
# Export parity PNGs from NativeParityCaptureTests (PARITY_CAPTURE=1).
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
OUT="${PARITY_OUTPUT_DIR:-$ROOT/build/desktop-parity/macos}"
RESULT="$ROOT/apps/calendar-macos/build/ParityCapture.xcresult"
SURFACES=(
  week-grid
  week-grid-allday
  demo-events-banner
  mod-hold-overlay
  up-next-banner
  mini-calendar
  event-form
  event-form-date-picker
  event-form-time-picker
  command-palette
  settings
  onboarding-welcome
)
mkdir -p "$OUT"
cd "$ROOT/apps/calendar-macos"

if ! command -v xcodegen >/dev/null 2>&1; then
  echo "xcodegen is required" >&2
  exit 1
fi

bash "$ROOT/.github/scripts/render-macos-icon.sh"
xcodegen generate

launchctl setenv PARITY_CAPTURE 1
launchctl setenv PARITY_OUTPUT_DIR "$OUT"

xcodebuild test \
  -project Compass.xcodeproj \
  -scheme Compass \
  -destination platform=macOS \
  -derivedDataPath build/DerivedData \
  -clonedSourcePackagesDirPath build/SourcePackages \
  -resultBundlePath build/ParityCapture.xcresult \
  -only-testing:CompassUITests/NativeParityCaptureTests/testExportParitySurfaces

if [ ! -d "$RESULT" ]; then
  echo "Missing result bundle at ${RESULT}" >&2
  exit 1
fi

RAW="$(mktemp -d)"
cleanup() {
  rm -rf "$RAW"
  launchctl unsetenv PARITY_CAPTURE 2>/dev/null || true
  launchctl unsetenv PARITY_OUTPUT_DIR 2>/dev/null || true
}
trap cleanup EXIT

# Fallback: copy from xcresult attachments if view-level export did not write files.
if ! python3 - "$OUT" "${SURFACES[@]}" <<'PY2' 2>/dev/null
import os, sys
out, *surfaces = sys.argv[1], sys.argv[2:]
missing = [s for s in surfaces if not os.path.isfile(os.path.join(out, f"{s}.png"))]
raise SystemExit(1 if missing else 0)
PY2
then
  xcrun xcresulttool export attachments --path "$RESULT" --output-path "$RAW" >/dev/null
  python3 - "$RAW" "$OUT" "${SURFACES[@]}" <<'PY'
import json
import os
import re
import shutil
import sys

raw, out, *surfaces = sys.argv[1], sys.argv[2], *sys.argv[3:]
wanted = set(surfaces)

with open(os.path.join(raw, "manifest.json")) as handle:
    manifest = json.load(handle)

found: dict[str, str] = {}
for test in manifest:
    for attachment in test.get("attachments", []):
        if attachment.get("isAssociatedWithFailure"):
            continue
        exported = attachment["exportedFileName"]
        if not exported.lower().endswith(".png"):
            continue
        name = attachment.get("suggestedHumanReadableName", exported)
        name = re.sub(r"_\d+_[0-9A-F-]{36}(\.\w+)?$", "", name)
        base = os.path.splitext(name)[0]
        if base in wanted and base not in found:
            found[base] = os.path.join(raw, exported)

missing = [s for s in surfaces if s not in found]
if missing:
    raise SystemExit(f"Missing parity attachments: {', '.join(missing)}")

for surface, src in found.items():
    shutil.copyfile(src, os.path.join(out, f"{surface}.png"))

print(f"Parity PNGs copied from xcresult to {out} ({len(found)} files)")
PY
fi

python3 - "$OUT" "${SURFACES[@]}" <<'PY'
import os
import sys

out, *surfaces = sys.argv[1], sys.argv[2:]
missing = [s for s in surfaces if not os.path.isfile(os.path.join(out, f"{s}.png"))]
if missing:
    raise SystemExit(f"Missing parity PNGs: {', '.join(missing)}")

try:
    from PIL import Image
except ImportError:
    Image = None

for surface in surfaces:
    path = os.path.join(out, f"{surface}.png")
    if Image is not None:
        width, height = Image.open(path).size
        if width != 1280:
            raise SystemExit(f"{surface}.png width {width}, expected 1280")

print(f"Parity PNGs written to {out} ({len(surfaces)} files)")
PY
