#!/usr/bin/env python3
"""Side-by-side macOS (left) and web (right) parity PNGs."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Pillow is required: pip install Pillow", file=sys.stderr)
    raise

SURFACES = (
    "week-grid",
    "mini-calendar",
    "event-form",
    "command-palette",
    "settings",
    "onboarding-welcome",
)

LABEL_HEIGHT = 36
GUTTER = 8
TARGET_WIDTH = 1280


def load_rgb(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGB")
    if image.width != TARGET_WIDTH:
        ratio = TARGET_WIDTH / image.width
        image = image.resize(
            (TARGET_WIDTH, max(1, int(image.height * ratio))),
            Image.Resampling.LANCZOS,
        )
    return image


def stack_pair(macos: Path, web: Path, title: str, out: Path) -> None:
    left = load_rgb(macos)
    right = load_rgb(web)
    height = max(left.height, right.height)

    def pad(image: Image.Image) -> Image.Image:
        if image.height >= height:
            return image
        canvas = Image.new("RGB", (image.width, height), (243, 238, 226))
        canvas.paste(image, (0, 0))
        return canvas

    left = pad(left)
    right = pad(right)
    total_w = left.width + GUTTER + right.width
    canvas = Image.new("RGB", (total_w, height + LABEL_HEIGHT), (255, 255, 255))
    draw = ImageDraw.Draw(canvas)
    draw.text((8, 8), f"{title}  —  macOS (left) · web (right)", fill=(64, 58, 47))
    canvas.paste(left, (0, LABEL_HEIGHT))
    canvas.paste(right, (left.width + GUTTER, LABEL_HEIGHT))
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out, format="PNG", optimize=True)
    print(out)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--macos-dir", type=Path, required=True)
    parser.add_argument("--web-dir", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    args = parser.parse_args()

    for surface in SURFACES:
        macos_path = args.macos_dir / f"{surface}.png"
        web_path = args.web_dir / f"{surface}.png"
        if not macos_path.is_file():
            print(f"Missing macOS capture: {macos_path}", file=sys.stderr)
            continue
        if not web_path.is_file():
            print(f"Missing web capture: {web_path}", file=sys.stderr)
            continue
        stack_pair(
            macos_path,
            web_path,
            surface,
            args.out_dir / f"{surface}-compare.png",
        )


if __name__ == "__main__":
    main()
