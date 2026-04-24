/**
 * Backend production build script.
 *
 * Bundles the Express app into a single Bun-native file.
 * All JS/TS dependencies (including @compass/core) are inlined.
 * Only native C/Rust modules are kept external and installed separately.
 *
 * Usage:
 *   bun run build:backend
 *   bun run build:backend --environment staging
 *   bun run build:backend --environment production
 */

import {
  COMPASS_BUILD_DEV,
  COMPASS_ROOT_DEV,
} from "@scripts/common/cli.constants";
import { getEnvironmentAnswer, log } from "@scripts/common/cli.utils";
import { $ } from "bun";
import path from "path";

const BACKEND_BUILD = path.join(COMPASS_BUILD_DEV, "backend");

// Parse --environment flag; prompt if absent
const envFlagIdx = process.argv.indexOf("--environment");
let environment: string =
  envFlagIdx !== -1 ? (process.argv[envFlagIdx + 1] ?? "") : "";

const validEnvs = ["local", "staging", "production"];
if (!validEnvs.includes(environment)) {
  environment = await getEnvironmentAnswer();
}

// 1. Clean old build
log.info("Removing old backend build ...");
await $`rm -rf ${BACKEND_BUILD}`.quiet();
log.success("Removed old backend build");

// 2. Bundle — full bundle so @compass/core and all JS/TS deps are inlined.
//    Native modules (C/Rust binaries) must stay external and be installed below.
log.info("Bundling backend ...");
const result = await Bun.build({
  entrypoints: [path.join(COMPASS_ROOT_DEV, "packages/backend/src/app.ts")],
  outdir: BACKEND_BUILD,
  target: "bun",
  sourcemap: "inline",
  minify: false,
  external: [
    "saslprep", // MongoDB optional C binding
  ],
});

if (!result.success) {
  log.error("Backend bundle failed:");
  for (const msg of result.logs) console.error(msg);
  process.exit(1);
}
log.success(`Bundled → ${BACKEND_BUILD}/app.js`);

// 3. Copy env file
const envName =
  environment === "production"
    ? ".env.production"
    : environment === "staging"
      ? ".env.staging"
      : ".env.local";
const envPath = path.join(COMPASS_ROOT_DEV, "packages/backend", envName);

if (await Bun.file(envPath).exists()) {
  await $`cp ${envPath} ${BACKEND_BUILD}/.env`.quiet();
  log.success("Copied env file");
} else {
  log.warning(`Env file not found: ${envPath}`);
}

// 4. Write a minimal package.json for the external native modules only.
//    Everything else is inlined in app.js — no full workspace needed.
const backendPkg = JSON.parse(
  await Bun.file(
    path.join(COMPASS_ROOT_DEV, "packages/backend/package.json"),
  ).text(),
) as { dependencies?: Record<string, string> };

const externalVersions: Record<string, string> = {};
for (const name of ["saslprep"]) {
  const version = backendPkg.dependencies?.[name];
  if (version) externalVersions[name] = version;
}

await Bun.write(
  path.join(BACKEND_BUILD, "package.json"),
  JSON.stringify({ dependencies: externalVersions }, null, 2),
);

// 5. Install only the external native modules
log.info("Installing native module dependencies ...");
const install = Bun.spawnSync({
  cmd: ["bun", "install", "--production", "--ignore-scripts", "--no-progress"],
  cwd: BACKEND_BUILD,
  stderr: "inherit",
  stdout: "inherit",
});
if (install.exitCode !== 0) {
  log.error("Dependency installation failed");
  process.exit(install.exitCode);
}

log.success("Backend build complete");
log.tip(`  Runtime: cd ${BACKEND_BUILD} && bun app.js`);
