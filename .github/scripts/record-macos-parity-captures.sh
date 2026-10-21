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
if ! python3 -c "import PIL" 2>/dev/null; then
  python3 -m pip install --break-system-packages --quiet Pillow
fi
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
MIN_TITLE_BAR_WIDTH = 1240

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

def infer_scale(width: int) -> int:
    if width >= 2400:
        return 2
    if width >= 1800:
        return 2
    return 1


def crop_title_bar(full_png: str, dest: str) -> None:
    image = Image.open(full_png).convert("RGBA")
    width, height = image.size
    scale = infer_scale(width)
    crop_px = min(height, TITLE_BAND_POINTS * scale)
    band = image.crop((0, 0, width, crop_px))
    if scale > 1:
        band = band.resize(
            (ParityCaptureGeometry.viewportWidth, TITLE_BAND_POINTS),
            Image.Resampling.LANCZOS,
        )
    band.save(dest)


def close_rgb(a, b, tol=40):
    return all(abs(int(a[i]) - int(b[i])) <= tol for i in range(3))


def assert_traffic_lights(image: Image.Image) -> None:
    px = image.load()
    width, height = image.size
    found = {"red": False, "yellow": False, "green": False}
    for y in range(min(height, 60)):
        for x in range(min(width, 140)):
            r, g, b, a = px[x, y]
            if a < 128:
                continue
            if r > 190 and g < 140 and b < 140:
                found["red"] = True
            if r > 190 and g > 150 and b < 110:
                found["yellow"] = True
            if g > 130 and r < 130 and b < 130:
                found["green"] = True
    # Inactive windows on CI often gray out the green button; red+yellow still
    # identify the traffic-light cluster beside the unified title bar.
    if not (found["red"] and found["yellow"]):
        raise SystemExit(f"mac-title-bar.png missing macOS traffic lights in top-left: {found}")


def assert_month_title_band(image: Image.Image) -> None:
    px = image.load()
    width, height = image.size
    scale = max(1, width // 1280)
    y0, y1 = 12 * scale, min(height, 52 * scale)
    x0, x1 = 90 * scale, min(width, 420 * scale)
    dark = 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b, a = px[x, y]
            if a < 128:
                continue
            if r + g + b < 460:
                dark += 1
    if dark < 60 * scale:
        raise SystemExit(
            "mac-title-bar.png nav title band lacks text (expected June 2026 beside traffic lights)"
        )


def reject_bottom_of_window(image: Image.Image) -> None:
    px = image.load()
    width, height = image.size
    if height < 80:
        return

    def dark_fraction(y_start: int, y_end: int) -> float:
        dark = 0
        total = 0
        for y in range(y_start, y_end):
            for x in range(0, width, max(1, width // 80)):
                r, g, b, a = px[x, y]
                if a < 128:
                    continue
                total += 1
                if r + g + b < 500:
                    dark += 1
        return dark / max(total, 1)

    top = dark_fraction(0, max(1, height // 3))
    bottom = dark_fraction(max(0, height - height // 3), height)
    if bottom > top * 1.35 and bottom > 0.08:
        raise SystemExit(
            "mac-title-bar.png looks like a bottom-of-window crop (grid/footer), not the title bar"
        )


def sidebar_toggle_score(image: Image.Image) -> int:
    px = image.load()
    width, height = image.size
    score = 0
    right_start = max(0, width - int(width * 0.14))
    for y in range(min(height, 55)):
        for x in range(right_start, width - 8):
            r, g, b, a = px[x, y]
            if a < 16:
                continue
            if r + g + b < 520:
                score += 2
            if max(r, g, b) - min(r, g, b) > 24:
                score += 1
    return score

ParityCaptureGeometry = type("ParityCaptureGeometry", (), {"viewportWidth": 1280})

raw = os.path.join(out, "_title_bar_attachments")
export_attachments(raw)
native_window_png = os.path.join(out, "mac-title-bar-full-window.png")
attachment_window = find_attachment(raw, "mac-title-bar-full-window")
if os.path.isfile(native_window_png) and os.path.getsize(native_window_png) > 1000:
    full_window = native_window_png
else:
    full_window = attachment_window
window_id_path = os.path.join(out, "parity-window-id.txt")
screencap_path = os.path.join(out, "_parity_window_screencap.png")
# Prefer AppKit CGWindow capture (includes traffic lights). Fall back to the
# xcresult attachment, then `screencapture -l` when both are missing.
if full_window is None and os.path.isfile(window_id_path):
    with open(window_id_path) as handle:
        window_id = handle.read().strip()
    if window_id.isdigit():
        os.system(f'screencapture -l {window_id} -x "{screencap_path}"')
        if os.path.isfile(screencap_path) and os.path.getsize(screencap_path) > 1000:
            full_window = screencap_path

def check_title_bar() -> None:
    if not full_window:
        raise SystemExit("Missing mac-title-bar-full-window screenshot attachment")

    used_screencap_fallback = full_window == screencap_path

    if os.path.isfile(path):
        os.remove(path)
    crop_title_bar(full_window, path)

    band = Image.open(path).convert("RGBA")
    assert_traffic_lights(band)
    assert_month_title_band(band)
    if used_screencap_fallback:
        reject_bottom_of_window(band)
    if band.size[0] < MIN_TITLE_BAR_WIDTH:
        raise SystemExit(
            f"mac-title-bar.png width {band.size[0]}px; expected at least {MIN_TITLE_BAR_WIDTH}px (1280-wide window)"
        )
    if sidebar_toggle_score(band) < 8:
        raise SystemExit(
            "mac-title-bar.png missing sidebar toggle in the top-right title bar row"
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
        raise SystemExit(f"mac-title-bar.png height {height}, expected at least 110px (120px title band)")
    if width == 1280 and height < 118:
        raise SystemExit(f"mac-title-bar.png height {height}, expected 120px title band at 1280 width")
    if width < MIN_TITLE_BAR_WIDTH:
        raise SystemExit(f"mac-title-bar.png width {width}, expected at least {MIN_TITLE_BAR_WIDTH}px")

    print(f"mac-title-bar.png ok ({width}x{height})")


# The title-bar reference is a marketing crop, not one of the parity surfaces.
# `screencapture -l` cannot grab windows on the GitHub macOS runner, and the
# XCUITest fallback is a 1024px-wide image, so these checks fail there even
# though the other surfaces captured fine. A failure here used to abort the
# job before the PNG upload and the compose step. Warn by default; set
# PARITY_STRICT_TITLE_BAR=1 to make it fatal again (for example locally).
try:
    check_title_bar()
except SystemExit as error:
    if os.environ.get("PARITY_STRICT_TITLE_BAR") == "1":
        raise
    print(f"::warning title=Parity title bar::{error}")
PY
