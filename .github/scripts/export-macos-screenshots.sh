#!/usr/bin/env bash
# Copies the image attachments from a CompassUITests result bundle into a
# folder named after their tests, so a PR's screenshots can be reviewed from
# the artifact without Xcode. Used by test-macos.yml after `xcodebuild test`.
#
# Usage: export-macos-screenshots.sh <path.xcresult> <output-dir>
# Output: <test-class>.<test-name>__<attachment>.png for snapshot tests, plus
# the .mp4 screen recordings XCTest keeps for failing UI tests. Attachments
# XCTest marks as part of a failure get a FAILED__ prefix.
set -euo pipefail

RESULT="${1:?usage: export-macos-screenshots.sh <path.xcresult> <output-dir>}"
OUT="${2:?usage: export-macos-screenshots.sh <path.xcresult> <output-dir>}"

if [ ! -d "$RESULT" ]; then
  echo "No result bundle at ${RESULT}; nothing to export."
  exit 0
fi

RAW="$(mktemp -d)"
trap 'rm -rf "$RAW"' EXIT
mkdir -p "$OUT"

xcrun xcresulttool export attachments --path "$RESULT" --output-path "$RAW" >/dev/null

python3 - "$RAW" "$OUT" <<'PY'
import json
import os
import re
import shutil
import sys

raw, out = sys.argv[1], sys.argv[2]
with open(os.path.join(raw, "manifest.json")) as handle:
    manifest = json.load(handle)

# Images from snapshot tests, plus the screen recordings XCTest attaches to
# failing UI tests.
image_ext = (".png", ".jpg", ".jpeg", ".heic", ".mp4")
count = 0
for test in manifest:
    test_id = test.get("testIdentifier", "unknown")
    test_slug = re.sub(r"[^A-Za-z0-9]+", ".", test_id).strip(".")
    for attachment in test.get("attachments", []):
        exported = attachment["exportedFileName"]
        ext = os.path.splitext(exported)[1].lower()
        if ext not in image_ext:
            continue
        # XCTest appends "_<index>_<uuid>" to the attachment name.
        name = attachment.get("suggestedHumanReadableName", exported)
        name = re.sub(r"_\d+_[0-9A-F-]{36}(\.\w+)?$", "", name)
        name = re.sub(r"[^A-Za-z0-9._-]+", "-", os.path.splitext(name)[0]).strip("-")
        prefix = "FAILED__" if attachment.get("isAssociatedWithFailure") else ""
        target = f"{prefix}{test_slug}__{name}{ext}"
        shutil.copyfile(os.path.join(raw, exported), os.path.join(out, target))
        count += 1
        print(target)

print(f"Exported {count} screenshot(s) to {out}")
PY
