/**
 * Runs `bun test --parallel` with a package preload and no shared mongod.
 * Used for core and mongo-free `:fast` tiers.
 *
 * Usage:
 *   bun test-parallel.ts <profile> -- [bun test flags/paths...]
 */

import { backendTestSpawnEnv } from "./backend-test-env";
import { formatDuration, resolveTestTargets } from "./runner-utils";
import { resolve } from "node:path";

type ProfileName =
  | "core"
  | "web"
  | "backend-fast"
  | "sync-fast"
  | "scripts-fast";

/** Synthetic URI for :fast tiers — env contract only, no mongod connection. */
const FAST_MONGO_URI = "mongodb://127.0.0.1:27017/unused-compass-test";

const PROFILES: Record<
  ProfileName,
  { preload: string; scan: string; label: string }
> = {
  core: {
    preload: "packages/scripts/src/testing/core.preload.ts",
    scan: "./packages/core/src",
    label: "core",
  },
  web: {
    preload: "packages/web/src/__tests__/web.preload.ts",
    scan: "./packages/web/src",
    label: "web",
  },
  "backend-fast": {
    preload: "packages/backend/src/__tests__/backend.preload.fast.ts",
    scan: "./packages/backend/src",
    label: "backend (fast)",
  },
  "sync-fast": {
    preload: "packages/sync/src/__tests__/sync.preload.fast.ts",
    scan: "./packages/sync/src",
    label: "sync (fast)",
  },
  "scripts-fast": {
    preload: "packages/scripts/src/testing/scripts.preload.fast.ts",
    scan: "./packages/scripts/src",
    label: "scripts (fast)",
  },
};

const profile = process.argv[2] as ProfileName;
const separatorIndex = process.argv.indexOf("--");
const extraArgs =
  separatorIndex === -1
    ? process.argv.slice(3)
    : process.argv.slice(separatorIndex + 1);

if (!profile || !PROFILES[profile]) {
  console.error(
    "Usage: test-parallel.ts <core|web|backend-fast|sync-fast|scripts-fast> -- [bun test flags/paths...]",
  );
  process.exit(2);
}

const { preload, scan, label } = PROFILES[profile];
const preloadPath = resolve(preload);
const { targets, bunFlags } = resolveTestTargets(scan, extraArgs);

const started = Date.now();

const needsHookTimeout =
  profile === "backend-fast" ||
  profile === "sync-fast" ||
  profile === "scripts-fast";

const testTargets = [
  "bun",
  "test",
  "--parallel",
  ...(needsHookTimeout ? ["--timeout", "60000"] : []),
  "--preload",
  preloadPath,
  ...bunFlags,
  ...targets,
];

console.log(`Running ${label}...`);

const spawnEnv =
  profile === "backend-fast" || profile === "scripts-fast"
    ? backendTestSpawnEnv(FAST_MONGO_URI)
    : { ...process.env, TZ: "Etc/UTC", NODE_ENV: "test" };

const proc = Bun.spawn(testTargets, {
  env: spawnEnv,
  stdout: "inherit",
  stderr: "inherit",
});
const code = await proc.exited;
console.log(`\n${label}: finished in ${formatDuration(started)}s`);

if (code !== 0) {
  process.exit(code ?? 1);
}
