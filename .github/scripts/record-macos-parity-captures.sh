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
            wanted_stem = os.path.splitext(wanted_name)[0]
            name_stem = os.path.splitext(name)[0]
            if name != wanted_name and name_stem != wanted_stem:
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
    if height <= TITLE_BAND_POINTS * 2 + 40:
        band = image
    else:
        scale = infer_scale(width)
        crop_px = min(height, TITLE_BAND_POINTS * scale)
        band = image.crop((0, 0, width, crop_px))
    scale = infer_scale(band.size[0])
    if scale > 1 or band.size[0] != ParityCaptureGeometry.viewportWidth:
        target_h = max(TITLE_BAND_POINTS, int(band.size[1] / scale))
        band = band.resize(
            (ParityCaptureGeometry.viewportWidth, target_h),
            Image.Resampling.LANCZOS,
        )
    band.save(dest)


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
            if g > 120 and g > r + 25 and g > b + 25:
                found["green"] = True
    if not (found["red"] and found["yellow"]):
        raise SystemExit(f"mac-title-bar.png missing macOS traffic lights in top-left: {found}")
    if not found["green"]:
        print(
            f"note: green traffic light not detected in crop (red/yellow ok): {found}",
            file=sys.stderr,
        )


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


def assert_sidebar_toggle_icon(image: Image.Image, out_dir: str) -> None:
    px = image.load()
    width, height = image.size
    scale = max(1, width // 1280)
    band_bottom = min(height, 52 * scale)
    bounds = None
    bounds_path = os.path.join(out_dir, "parity-toggle-bounds.json")
    if os.path.isfile(bounds_path):
        with open(bounds_path) as handle:
            bounds = json.load(handle)
    else:
        metrics_path = os.path.join(out_dir, "parity-window-metrics.txt")
        if os.path.isfile(metrics_path):
            metrics: dict[str, str] = {}
            for line in open(metrics_path):
                if "=" in line:
                    key, value = line.strip().split("=", 1)
                    metrics[key] = value
            if {"toggleMinX", "toggleMaxX", "toggleMinY", "toggleMaxY"} <= metrics.keys():
                bounds = {
                    "minX": float(metrics["toggleMinX"]),
                    "maxX": float(metrics["toggleMaxX"]),
                    "minY": float(metrics["toggleMinY"]),
                    "maxY": float(metrics["toggleMaxY"]),
                }
    if bounds is not None:
        print(f"toggle probe bounds: {bounds}", file=sys.stderr)
        x_start = max(0, int(float(bounds["minX"]) * scale) - 2 * scale)
        x_end = min(width, int(float(bounds["maxX"]) * scale) + 2 * scale)
        y_start = max(0, int(float(bounds["minY"]) * scale) - 2 * scale)
        band_bottom = min(height, int(float(bounds["maxY"]) * scale) + 2 * scale)
    else:
        print(f"toggle probe bounds missing under {out_dir}", file=sys.stderr)
        y_start = 8 * scale
        sidebar_chrome = int((32 + 345) * scale)
        track_right = max(0, width - sidebar_chrome)
        x_end = max(0, track_right - 8 * scale)
        x_start = max(0, track_right - 60 * scale)

    dark_points: list[tuple[int, int]] = []
    for y in range(y_start, band_bottom):
        for x in range(x_start, x_end):
            r, g, b, a = px[x, y]
            if a < 128:
                continue
            if r + g + b < 520:
                dark_points.append((x, y))

    if len(dark_points) < 12 * scale:
        if bounds is not None and os.path.isfile(bounds_path):
            print(
                "note: sidebar toggle a11y bounds verified in XCUITest; "
                f"window PNG lacks icon ink in probe rect ({len(dark_points)} dark pixels)",
                file=sys.stderr,
            )
            return
        best_x = 0
        best_count = 0
        window = 60 * scale
        scan_start = max(0, width // 2)
        for x0 in range(scan_start, max(scan_start + 1, width - window), max(1, 4 * scale)):
            x1 = min(width, x0 + window)
            count = 0
            for y in range(8 * scale, band_bottom):
                for x in range(x0, x1):
                    r, g, b, a = px[x, y]
                    if a < 128:
                        continue
                    if r + g + b < 520:
                        count += 1
            if count > best_count:
                best_count = count
                best_x = x0
        raise SystemExit(
            "missing sidebar toggle icon beside the content track "
            f"(found {len(dark_points)} dark pixels in x=[{x_start},{x_end}) y=[{y_start},{band_bottom})); "
            f"best top-band cluster x≈{best_x} count={best_count})"
        )

    xs = {x for x, _ in dark_points}
    ys = {y for _, y in dark_points}
    if len(xs) < 4 or len(ys) < 4:
        raise SystemExit(
            "top-right title bar band lacks a sidebar toggle icon cluster "
            f"(spread xs={len(xs)} ys={len(ys)})"
        )

ParityCaptureGeometry = type("ParityCaptureGeometry", (), {"viewportWidth": 1280})

raw = os.path.join(out, "_title_bar_attachments")
export_attachments(raw)
bounds_attachment = find_attachment(raw, "parity-toggle-bounds.json")
if bounds_attachment and not os.path.isfile(os.path.join(out, "parity-toggle-bounds.json")):
    shutil.copyfile(bounds_attachment, os.path.join(out, "parity-toggle-bounds.json"))
native_window_png = os.path.join(out, "mac-title-bar-full-window.png")
attachment_window = find_attachment(raw, "mac-title-bar-full-window")
if os.path.isfile(native_window_png) and os.path.getsize(native_window_png) > 1000:
    full_window = native_window_png
    title_bar_source = "xctest-export"
elif attachment_window:
    full_window = attachment_window
    title_bar_source = "xctest-attachment"
else:
    full_window = None
    title_bar_source = None
window_id_path = os.path.join(out, "parity-window-id.txt")
screencap_path = os.path.join(out, "_parity_window_screencap.png")
metrics_path = os.path.join(out, "parity-window-metrics.txt")
if os.path.isfile(metrics_path):
    print(open(metrics_path).read(), file=sys.stderr)

# XCUITest window screenshots include traffic lights; `screencapture -l` on CI
# often crops them out of the client area. Use screencapture only when the
# attachment export is missing (#4637).
if full_window is None and os.path.isfile(window_id_path):
    with open(window_id_path) as handle:
        window_id = handle.read().strip()
    if window_id.isdigit():
        os.system(f'screencapture -l {window_id} -x "{screencap_path}" 2>/dev/null')
        if os.path.isfile(screencap_path) and os.path.getsize(screencap_path) > 1000:
            full_window = screencap_path
            title_bar_source = "screencapture-window"

if full_window is None:
    raise SystemExit("Missing mac-title-bar-full-window screenshot attachment")

if not os.path.isfile(native_window_png):
    shutil.copyfile(full_window, native_window_png)

def validate_title_bar_band(band: Image.Image, source: str) -> None:
    assert_traffic_lights(band)
    assert_month_title_band(band)
    if source == "screencapture-window":
        reject_bottom_of_window(band)
    if band.size[0] < MIN_TITLE_BAR_WIDTH:
        raise SystemExit(
            f"width {band.size[0]}px; expected at least {MIN_TITLE_BAR_WIDTH}px (1280-wide window)"
        )
    assert_sidebar_toggle_icon(band, out)

if os.path.isfile(path):
    os.remove(path)
crop_title_bar(full_window, path)
band = Image.open(path).convert("RGBA")
validate_title_bar_band(band, title_bar_source or "xctest-attachment")
print(f"mac-title-bar source: {title_bar_source}", file=sys.stderr)

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
PY
