/**
 * Isolated test runner for packages whose tests need a fresh module registry.
 *
 * Bun runs every file in a package inside ONE process, sharing the module
 * registry -- singletons, open handles and mock state leak between files, which
 * Jest avoided by giving each file its own registry. To get that isolation back
 * without paying Jest's per-file overhead, this launcher:
 *
 *   1. Boots one in-memory Mongo replica set when the package needs it.
 *   2. Runs each test file in its own `bun test` process (fresh modules =
 *      isolation). Mongo-backed packages share the server through distinct
 *      per-file databases so their files can run in parallel without colliding.
 *   3. Bounds parallelism to the core count and streams a compact summary.
 *
 * Usage:
 *   bun run-tests.ts <backend|scripts|sync|web> [--filter substring] [--tier fast|db]
 *
 * Tiers are classified automatically (no hand-maintained allowlist): a file is
 * "db" if it touches the Mongo test harness (setupTestDb), otherwise "fast".
 */
import { Glob } from "bun";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { readFileSync } from "node:fs";
import { cpus } from "node:os";
import { resolve } from "node:path";

type PackageName = "backend" | "scripts" | "sync" | "web";

const PACKAGES: Record<
  PackageName,
  { root: string; preload: string; usesMongo: boolean }
> = {
  backend: {
    root: "packages/backend/src",
    preload: "packages/backend/src/__tests__/backend.preload.ts",
    usesMongo: true,
  },
  scripts: {
    root: "packages/scripts/src",
    preload: "packages/scripts/src/testing/scripts.preload.ts",
    usesMongo: true,
  },
  sync: {
    root: "packages/sync/src",
    preload: "packages/sync/src/__tests__/sync.preload.ts",
    usesMongo: true,
  },
  web: {
    root: "packages/web/src",
    preload: "packages/web/src/__tests__/web.preload.ts",
    usesMongo: false,
  },
};

const pkg = process.argv[2] as PackageName;
if (!pkg || !PACKAGES[pkg]) {
  console.error(
    "Usage: run-tests.ts <backend|scripts|sync|web> [--filter substring]",
  );
  process.exit(2);
}

const filterIdx = process.argv.indexOf("--filter");
const filter = filterIdx !== -1 ? process.argv[filterIdx + 1] : undefined;

const tierIdx = process.argv.indexOf("--tier");
const tier = tierIdx !== -1 ? process.argv[tierIdx + 1] : undefined; // fast | db
if (tier && tier !== "fast" && tier !== "db") {
  console.error("--tier must be 'fast' or 'db'");
  process.exit(2);
}

const { root, preload: preloadRel, usesMongo } = PACKAGES[pkg];
const preload = resolve(preloadRel);

// A file is "db" if it touches a Mongo test harness; otherwise "fast".
// Derived from the source, so the classification can never drift out of sync
// with a hand-maintained list.
const isDbFile = (path: string): boolean =>
  /\bsetupTestDb\b|\bsetupSyncStorage\b|\bSYNC_MONGO_URI\b/.test(
    readFileSync(path, "utf8"),
  );

const files = Array.from(new Glob("**/*.{test,spec}.{ts,tsx}").scanSync(root))
  .map((rel) => `${root}/${rel}`)
  .filter((f) => (filter ? f.includes(filter) : true))
  .filter((f) => {
    if (!tier) return true;
    const db = isDbFile(f);
    return tier === "db" ? db : !db;
  })
  .sort();

if (files.length === 0) {
  console.error(
    `No test files found in ${root}${filter ? ` matching ${filter}` : ""}`,
  );
  process.exit(1);
}

const started = Date.now();
console.log(`Running ${files.length} isolated ${pkg} test files...`);

const server = usesMongo
  ? await MongoMemoryReplSet.create({
      replSet: { count: 1, name: "compass-test", storageEngine: "wiredTiger" },
    })
  : undefined;

// Mongo needs CPU headroom to stay responsive while its test files run. Web
// has no shared service, so use every available core for its larger suite.
const reservedCpus = usesMongo ? 1 : 0;
const concurrency = Math.max(1, Math.min(cpus().length - reservedCpus, 8));

let nextIndex = 0;
let passedFiles = 0;
const failedFiles: string[] = [];
let totalPass = 0;
let totalFail = 0;
let totalSkip = 0;

const countRe = /^\s*(\d+)\s+(pass|fail|skip)\b/gm;

async function runOne(index: number): Promise<void> {
  const file = files[index]!;
  const label = file.replace(`${root}/`, "");
  const env: Record<string, string | undefined> = {
    ...process.env,
    TZ: "Etc/UTC",
  };
  if (server) {
    env["COMPASS_TEST_MONGO_URI"] = server.getUri(`testdb_${index}`);
  }

  const proc = Bun.spawn(["bun", "test", file, "--preload", preload], {
    env,
    stdout: "pipe",
    stderr: "pipe",
  });

  // A file that hangs (leaked handle, unresolved promise) must not stall the
  // whole run; kill it and record a failure after a generous ceiling.
  const timeout = setTimeout(() => proc.kill(9), 90_000);

  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  clearTimeout(timeout);

  const combined = `${stdout}\n${stderr}`;
  for (const m of combined.matchAll(countRe)) {
    const n = Number(m[1]);
    if (m[2] === "pass") totalPass += n;
    else if (m[2] === "fail") totalFail += n;
    else totalSkip += n;
  }

  if (code === 0) {
    passedFiles++;
    process.stdout.write(".");
  } else {
    failedFiles.push(label);
    process.stdout.write("F");
    // Surface the failing file's output immediately for debugging.
    console.log(`\n----- FAIL ${label} -----`);
    console.log(combined.trimEnd());
    console.log(`----- end ${label} -----`);
  }
}

async function worker(): Promise<void> {
  while (nextIndex < files.length) {
    const index = nextIndex++;
    await runOne(index);
  }
}

try {
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
} finally {
  // Always tear the server down, even if a worker threw (e.g. a failed
  // spawn) -- otherwise the mongod process would be orphaned.
  await server?.stop();
}

const seconds = ((Date.now() - started) / 1000).toFixed(1);
console.log(
  `\n\n${pkg}: ${passedFiles}/${files.length} files passed | ` +
    `${totalPass} pass, ${totalFail} fail, ${totalSkip} skip | ${seconds}s`,
);

if (failedFiles.length > 0) {
  console.log(`Failed files:\n  ${failedFiles.join("\n  ")}`);
  process.exit(1);
}
