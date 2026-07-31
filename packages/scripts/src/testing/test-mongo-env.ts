/**
 * Boots one in-memory Mongo replica set and runs native `bun test --parallel`
 * with shared mongod. Per-file DB isolation uses setupTestDb(import.meta.url).
 *
 * Glob paths are passed through to Bun — never expanded into per-file argv lists,
 * which can hang the runner.
 *
 * Usage:
 *   bun test-mongo-env.ts <backend|scripts|sync> -- [bun test flags/paths...]
 */
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { backendTestSpawnEnv } from "./backend-test-env";
import {
  formatDuration,
  resolveTestTargets,
  warnIfBunVersionMismatch,
} from "./runner-utils";
import { resolve } from "node:path";

warnIfBunVersionMismatch("1.3.14");

type PackageName = "backend" | "scripts" | "sync";

const PACKAGES: Record<
  PackageName,
  { preload: string; scan: string; glob: string }
> = {
  backend: {
    preload: "packages/backend/src/__tests__/backend.preload.ts",
    scan: "./packages/backend/src",
    glob: "packages/backend/src/**/*.{test,spec}.{ts,tsx}",
  },
  scripts: {
    preload: "packages/scripts/src/testing/scripts.preload.ts",
    scan: "./packages/scripts/src",
    glob: "packages/scripts/src/**/*.{test,spec}.{ts,tsx}",
  },
  sync: {
    preload: "packages/sync/src/__tests__/sync.preload.ts",
    scan: "./packages/sync/src",
    glob: "packages/sync/src/**/*.{test,spec}.{ts,tsx}",
  },
};

const pkg = process.argv[2] as PackageName;
const separatorIndex = process.argv.indexOf("--");
const extraArgs =
  separatorIndex === -1
    ? process.argv.slice(3)
    : process.argv.slice(separatorIndex + 1);

if (!pkg || !PACKAGES[pkg]) {
  console.error(
    "Usage: test-mongo-env.ts <backend|scripts|sync> -- [bun test flags/paths...]",
  );
  process.exit(2);
}

const { preload, scan } = PACKAGES[pkg];
const preloadPath = resolve(preload);
const { targets, bunFlags, label } = resolveTestTargets(scan, extraArgs);

const started = Date.now();

const server = await MongoMemoryReplSet.create({
  replSet: { count: 1, name: "compass-test", storageEngine: "wiredTiger" },
});
const mongoUri = server.getUri();
const env = backendTestSpawnEnv(mongoUri);

const testTargets = [
  "bun",
  "test",
  "--parallel",
  // Db-heavy suites connect many workers to one shared mongod; the default 5s
  // hook budget is too tight under parallel index installs.
  "--timeout",
  "60000",
  "--preload",
  preloadPath,
  ...bunFlags,
  ...targets,
];

console.log(`Running ${label} (${pkg})...`);

try {
  const proc = Bun.spawn(testTargets, {
    env,
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  console.log(`\n${pkg}: finished in ${formatDuration(started)}s`);

  if (code !== 0) {
    process.exit(code ?? 1);
  }
} finally {
  await server.stop();
}
