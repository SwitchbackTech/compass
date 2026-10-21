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


def assert_sidebar_toggle_icon(image: Image.Image) -> None:
    """Require a phosphor-style icon cluster beside the content track (web CalendarHeader)."""
    px = image.load()
    width, height = image.size
    scale = max(1, width // 1280)
    band_bottom = min(height, 52 * scale)
    # Parity captures keep the sidebar open @ 345px + 32px divider (see ParityCaptureGeometry).
    sidebar_chrome = int((32 + 345) * scale)
    track_right = max(0, width - sidebar_chrome)
    x_end = max(0, track_right - 8 * scale)
    x_start = max(0, track_right - 60 * scale)

    dark_points: list[tuple[int, int]] = []
    for y in range(8 * scale, band_bottom):
        for x in range(x_start, x_end):
            r, g, b, a = px[x, y]
            if a < 128:
                continue
            if r + g + b < 430:
                dark_points.append((x, y))

    if len(dark_points) < 18 * scale:
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
                    if r + g + b < 430:
                        count += 1
            if count > best_count:
                best_count = count
                best_x = x0
        raise SystemExit(
            "missing sidebar toggle icon beside the content track "
            f"(found {len(dark_points)} dark pixels in x=[{x_start},{x_end}) y=[{8 * scale},{band_bottom})); "
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
full_window = find_attachment(raw, "mac-title-bar-full-window")
window_top = os.path.join(out, "parity-window-top.png")
window_id_path = os.path.join(out, "parity-window-id.txt")
screencap_path = os.path.join(out, "_parity_window_screencap.png")
metrics_path = os.path.join(out, "parity-window-metrics.txt")
if os.path.isfile(metrics_path):
    print(open(metrics_path).read(), file=sys.stderr)

def validate_title_bar_band(band: Image.Image) -> None:
    assert_traffic_lights(band)
    assert_month_title_band(band)
    reject_bottom_of_window(band)
    if band.size[0] < MIN_TITLE_BAR_WIDTH:
        raise SystemExit(
            f"width {band.size[0]}px; expected at least {MIN_TITLE_BAR_WIDTH}px (1280-wide window)"
        )
    assert_sidebar_toggle_icon(band)

candidates: list[tuple[str, str]] = []
if os.path.isfile(window_top) and os.path.getsize(window_top) > 1000:
    candidates.append(("parity-window-top", window_top))
if os.path.isfile(window_id_path):
    with open(window_id_path) as handle:
        window_id = handle.read().strip()
    if window_id.isdigit():
        os.system(f'screencapture -l {window_id} -x "{screencap_path}"')
        if os.path.isfile(screencap_path) and os.path.getsize(screencap_path) > 1000:
            candidates.append(("screencapture-window", screencap_path))
if full_window:
    candidates.append(("xcui-window", full_window))
if not candidates:
    raise SystemExit("Missing mac-title-bar-full-window screenshot attachment")

errors: list[str] = []
chosen = None
for name, src in candidates:
    try:
        if os.path.isfile(path):
            os.remove(path)
        crop_title_bar(src, path)
        band = Image.open(path).convert("RGBA")
        validate_title_bar_band(band)
        chosen = name
        break
    except SystemExit as exc:
        errors.append(f"{name}: {exc}")
        if os.path.isfile(path):
            os.remove(path)

if chosen is None:
    raise SystemExit("No valid title bar capture:\n" + "\n".join(errors))
print(f"mac-title-bar source: {chosen}", file=sys.stderr)
band = Image.open(path).convert("RGBA")

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
