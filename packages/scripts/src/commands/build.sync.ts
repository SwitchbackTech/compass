/**
 * Sync service production build script.
 *
 * Bundles the Sync service into a single Bun-native file, mirroring the backend
 * build. All JS/TS dependencies (including @compass/core) are inlined.
 *
 * Usage:
 *   bun run build:sync
 */

import {
  COMPASS_BUILD_DEV,
  COMPASS_ROOT_DEV,
} from "@scripts/common/cli.constants";
import { $ } from "bun";
import path from "node:path";
import { styleText } from "node:util";

const SYNC_BUILD = path.join(COMPASS_BUILD_DEV, "sync");

const log = {
  info: (msg: string) => console.log(styleText(["italic", "whiteBright"], msg)),
  error: (msg: string) => console.log(styleText(["bold", "red"], msg)),
  warning: (msg: string) => console.log(styleText("yellow", msg)),
  success: (msg: string) => console.log(styleText("green", msg)),
  tip: (msg: string) => console.log(styleText("yellowBright", msg)),
};

// 1. Clean old build
log.info("Removing old sync build ...");
await $`rm -rf ${SYNC_BUILD}`.quiet();
log.success("Removed old sync build");

// 2. Bundle — full bundle so @compass/core and all JS/TS deps are inlined.
log.info("Bundling sync ...");
const result = await Bun.build({
  entrypoints: [path.join(COMPASS_ROOT_DEV, "packages/sync/src/app.ts")],
  outdir: SYNC_BUILD,
  target: "bun",
  sourcemap: "inline",
  minify: false,
});

if (!result.success) {
  log.error("Sync bundle failed:");
  for (const msg of result.logs) console.error(msg);
  process.exit(1);
}
log.success(`Bundled → ${SYNC_BUILD}/app.js`);

// 3. Copy config file when present for local bundled runs.
const configPath = process.env["COMPASS_CONFIG_FILE"]
  ? path.resolve(process.env["COMPASS_CONFIG_FILE"])
  : path.join(COMPASS_ROOT_DEV, "compass.yaml");

if (await Bun.file(configPath).exists()) {
  await $`cp ${configPath} ${SYNC_BUILD}/compass.yaml`.quiet();
  log.success("Copied Compass config file");
} else {
  log.warning(`Compass config file not found: ${configPath}`);
}

// 4. Write a minimal package.json. Everything is inlined in app.js.
await Bun.write(
  path.join(SYNC_BUILD, "package.json"),
  JSON.stringify({ dependencies: {} }, null, 2),
);

// 5. Install an empty production dependency tree so Bun writes its runtime files.
log.info("Installing production dependency metadata ...");
const install = Bun.spawnSync({
  cmd: ["bun", "install", "--production", "--ignore-scripts", "--no-progress"],
  cwd: SYNC_BUILD,
  stderr: "inherit",
  stdout: "inherit",
});
if (install.exitCode !== 0) {
  log.error("Dependency installation failed");
  process.exit(install.exitCode);
}

log.success("Sync build complete");
log.tip(`  Runtime: cd ${SYNC_BUILD} && bun app.js`);
