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
python3 -m pip install --user --quiet Pillow
cd "$ROOT/apps/calendar-macos"

if ! command -v xcodegen >/dev/null 2>&1; then
  echo "xcodegen is required" >&2
  exit 1
fi

bash "$ROOT/.github/scripts/render-macos-icon.sh"
xcodegen generate

launchctl setenv PARITY_CAPTURE 1
launchctl setenv PARITY_OUTPUT_DIR "$OUT"
export PARITY_OUTPUT_DIR="$OUT"
export PARITY_CAPTURE=1

xcodebuild test \
  -project Compass.xcodeproj \
  -scheme Compass \
  -destination platform=macOS \
  -derivedDataPath build/DerivedData \
  -clonedSourcePackagesDirPath build/SourcePackages \
  -resultBundlePath build/ParityCapture.xcresult \
  -only-testing:CompassUITests/NativeParityCaptureTests

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
out = sys.argv[1]
surfaces = sys.argv[2:]
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

raw = sys.argv[1]
out = sys.argv[2]
surfaces = sys.argv[3:]
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

out = sys.argv[1]
surfaces = sys.argv[2:]
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

python3 - "$RESULT" "$OUT" <<'PY'
import json
import os
import re
import shutil
import struct
import sys

from PIL import Image

result = sys.argv[1]
out = sys.argv[2]
path = os.path.join(out, "mac-title-bar.png")
TITLE_BAND_POINTS = 120
CONTENT_HEIGHT_POINTS = 820

def export_attachments(raw_dir: str) -> None:
    os.makedirs(raw_dir, exist_ok=True)
    os.system(
        f'xcrun xcresulttool export attachments --path "{result}" --output-path "{raw_dir}" >/dev/null 2>&1'
    )

def find_attachment(raw_dir: str, wanted_name: str) -> str | None:
    manifest_path = os.path.join(raw_dir, "manifest.json")
    if not os.path.isfile(manifest_path):
        return None
    with open(manifest_path) as handle:
        manifest = json.load(handle)
    for test in manifest:
        for attachment in test.get("attachments", []):
            if attachment.get("isAssociatedWithFailure"):
                continue
            name = attachment.get("suggestedHumanReadableName", attachment.get("exportedFileName", ""))
            name = re.sub(r"_\d+_[0-9A-F-]{36}(\.\w+)?$", "", name)
            if name != wanted_name:
                continue
            src = os.path.join(raw_dir, attachment["exportedFileName"])
            if os.path.isfile(src):
                return src
    return None

def crop_title_bar(full_png: str, dest: str) -> None:
    image = Image.open(full_png).convert("RGBA")
    width, height = image.size
    # Window screenshot: take the top band (title bar + a slice of grid below).
    crop_px = max(110, round(height * TITLE_BAND_POINTS / (CONTENT_HEIGHT_POINTS + TITLE_BAND_POINTS)))
    crop_px = min(crop_px, height)
    band = image.crop((0, 0, width, crop_px))
    band.save(dest)

def chrome_score(image: Image.Image) -> int:
    px = image.load()
    width, height = image.size
    score = 0
    for y in range(min(height, 80)):
        for x in range(min(width, 220)):
            r, g, b, a = px[x, y]
            if a < 16:
                continue
            if r + g + b < 520:
                score += 2
            if max(r, g, b) - min(r, g, b) > 28:
                score += 1
    return score

raw = os.path.join(out, "_title_bar_attachments")
export_attachments(raw)
full_window = find_attachment(raw, "mac-title-bar-full-window")
if not full_window:
    raise SystemExit("Missing mac-title-bar-full-window screenshot attachment")

crop_title_bar(full_window, path)
band = Image.open(path).convert("RGBA")
if band.size[1] < 100 or chrome_score(band) < 12:
    raise SystemExit(
        "mac-title-bar.png crop looks empty; expected traffic lights and nav chrome in the top band"
    )

if not os.path.isfile(path):
    raise SystemExit("Missing mac-title-bar.png (title bar marketing reference)")

with open(path, "rb") as handle:
    signature = handle.read(8)
    if signature != b"\x89PNG\r\n\x1a\n":
        raise SystemExit("mac-title-bar.png is not a PNG")
    handle.read(4)
    chunk = handle.read(4)
    if chunk != b"IHDR":
        raise SystemExit("mac-title-bar.png missing IHDR")
    width, height = struct.unpack(">II", handle.read(8))

if height < 110:
    raise SystemExit(f"mac-title-bar.png height {height}, expected at least 110px")
if width < 400:
    raise SystemExit(f"mac-title-bar.png width {width}, expected a full window slice")

print(f"mac-title-bar.png ok ({width}x{height})")
PY
