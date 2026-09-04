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

/**
 * A worker that ends still holding an open handle (a Mongo connection is the
 * usual culprit: cleanupTestDb deliberately never disconnects, and the
 * shared-mongod path makes stopMemoryMongo a no-op) never exits, so `bun test`
 * never exits either. Bun has already printed its summary by then, so the
 * summary is the result: once "Ran N tests across M files" appears, give the
 * process a moment to exit on its own, then kill it and exit with the pass or
 * fail Bun reported. Twice on 2026-09-03 this leak turned a fully green
 * scripts suite into a four-minute wait and a red main.
 *
 * If no summary ever appears, the run is genuinely wedged; four minutes is
 * well clear of the slowest suite (sync, ~105s on ubuntu-latest) and inside
 * the CI step timeout, so the failure is named here instead of silently.
 */
const EXIT_TIMEOUT_MS = 4 * 60 * 1000;
const EXIT_GRACE_MS = 3_000;

/** Bun writes its summary to stderr; reports fail + error counts once it lands. */
function watchForSummary(
  stream: ReadableStream<Uint8Array>,
  onSummary: (failed: number) => void,
): void {
  const decoder = new TextDecoder();
  let tail = "";
  let failed = 0;
  const reader = stream.getReader();
  const pump = (): Promise<void> =>
    reader.read().then(({ done, value }) => {
      if (done) return;
      const text = decoder.decode(value, { stream: true });
      process.stderr.write(text);
      tail = (tail + text).slice(-4096);
      for (const line of tail.matchAll(/^\s*(\d+) (fail|error)s?$/gm)) {
        failed += Number(line[1]);
      }
      if (/^Ran \d+ tests? across \d+ files?\./m.test(tail)) {
        onSummary(failed);
        failed = 0;
        tail = "";
      }
      return pump();
    });
  void pump();
}

try {
  const proc = Bun.spawn(testTargets, {
    env,
    stdout: "inherit",
    stderr: "pipe",
  });

  let wedged: ReturnType<typeof setTimeout> | undefined;
  let grace: ReturnType<typeof setTimeout> | undefined;
  const code = await new Promise<number>((resolve) => {
    proc.exited.then((exit) => resolve(exit ?? 1));
    watchForSummary(proc.stderr, (failed) => {
      grace = setTimeout(() => {
        console.error(
          `\n${pkg}: 'bun test' printed its summary but did not exit; a worker ` +
            `is holding an open handle. Using the summary as the result.`,
        );
        proc.kill();
        resolve(failed > 0 ? 1 : 0);
      }, EXIT_GRACE_MS);
    });
    wedged = setTimeout(() => {
      console.error(
        `\n${pkg}: tests stopped reporting and 'bun test' has not exited after ` +
          `${formatDuration(started)}s with no summary. Killing it so the ` +
          `failure is visible rather than a silent step timeout.`,
      );
      proc.kill();
      resolve(1);
    }, EXIT_TIMEOUT_MS);
  });
  clearTimeout(wedged);
  clearTimeout(grace);

  console.log(`\n${pkg}: finished in ${formatDuration(started)}s`);

  if (code !== 0) {
    process.exit(code);
  }
} finally {
  await server.stop();
}
