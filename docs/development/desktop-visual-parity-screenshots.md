# Desktop visual parity screenshots

Side-by-side PNGs compare **native macOS** (1280×820 content window) with **web**
(Playwright viewport 1280×820, Light Beach, demo-seed fixture) for dogfood review.

## Run locally

Web captures (Linux/macOS/Windows):

```bash
bun run parity:screenshots:web
# output: build/desktop-parity/web/*.png
```

macOS captures (Mac with XcodeGen):

```bash
PARITY_OUTPUT_DIR=build/desktop-parity/macos bash .github/scripts/record-macos-parity-captures.sh
```

Compose (requires Pillow: `pip install Pillow`):

```bash
python3 .github/scripts/compose-desktop-parity-shots.py \
  --macos-dir build/desktop-parity/macos \
  --web-dir build/desktop-parity/web \
  --out-dir build/desktop-parity/compare
```

## CI

Workflow: [`.github/workflows/desktop-web-parity-screenshots.yml`](../../.github/workflows/desktop-web-parity-screenshots.yml)

- **workflow_dispatch** or PRs touching desktop UI / `e2e/parity/`
- Artifacts: `desktop-parity-web`, `desktop-parity-macos`, `desktop-parity-compare`

Surfaces: `week-grid`, `mini-calendar`, `event-form`, `command-palette`, `settings`, `onboarding-welcome`.

Web seed uses `CompassKit/Resources/Fixtures/demo-seed.json` and pins `compass.localCalendarId` to the export calendar id so events render like native `-COMPASS_FIXTURE demo`.

Tracking: [#4331](https://github.com/KeepSoftwareSimple/compass-calendar/issues/4331).
