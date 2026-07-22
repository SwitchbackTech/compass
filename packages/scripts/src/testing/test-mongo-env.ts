/**
 * Boots one in-memory Mongo replica set and runs native `bun test --parallel`
 * with shared mongod. Per-file DB isolation uses setupTestDb(import.meta.url).
 *
 * Backend runs enforce a 60s wall-clock budget by default (override with
 * COMPASS_TEST_MAX_SECONDS). Glob paths are passed through to Bun — never
 * expanded into per-file argv lists, which can hang the runner.
 *
 * Usage:
 *   bun test-mongo-env.ts <backend|scripts|sync> -- [bun test flags/paths...]
 */
import { Glob } from "bun";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { backendTestSpawnEnv } from "./backend-test-env";
import {
  appendPerTestTimeout,
  createOutputTee,
  parseMaxSeconds,
  remainingSeconds,
  reportSlowTestsAfterRun,
  reportSuiteTimeout,
  waitForProcessExit,
  withDeadline,
  type TestRunPhase,
} from "./test-run-timeout";
import { resolve } from "node:path";

type PackageName = "backend" | "scripts" | "sync";

const DEFAULT_MAX_SECONDS: Partial<Record<PackageName, number>> = {
  backend: 60,
};

function maxSecondsFor(pkg: PackageName): number | undefined {
  return parseMaxSeconds(process.env.COMPASS_TEST_MAX_SECONDS, DEFAULT_MAX_SECONDS[pkg]);
}

const PACKAGES: Record<PackageName, { preload: string; scan: string; glob: string }> =
  {
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

function parseExtraArgs(extraArgs: string[]): {
  bunFlags: string[];
  ignorePattern?: string;
  explicitPaths: string[];
} {
  const bunFlags: string[] = [];
  const explicitPaths: string[] = [];
  let ignorePattern: string | undefined;

  for (let i = 0; i < extraArgs.length; i++) {
    const arg = extraArgs[i]!;

    if (arg === "--path-ignore-patterns") {
      ignorePattern = extraArgs[i + 1];
      i++;
      continue;
    }

    if (arg.startsWith("-")) {
      bunFlags.push(arg);
      continue;
    }

    if (!arg.includes("*")) {
      explicitPaths.push(arg.startsWith("./") ? arg : `./${arg}`);
      continue;
    }

    const matches = Array.from(new Glob(arg).scanSync("."));
    if (matches.length === 0) {
      console.error(`No test files matched: ${arg}`);
      process.exit(1);
    }

    // Pass the glob through to Bun — expanding many files into argv can hang the runner.
    explicitPaths.push(arg.startsWith("./") ? arg : `./${arg}`);
  }

  return { bunFlags, ignorePattern, explicitPaths };
}

function resolveTestTargets(
  scan: string,
  extraArgs: string[],
): { targets: string[]; bunFlags: string[]; label: string } {
  const { bunFlags, ignorePattern, explicitPaths } = parseExtraArgs(extraArgs);

  if (explicitPaths.length > 0) {
    return {
      targets: explicitPaths,
      bunFlags,
      label: explicitPaths.join(", "),
    };
  }

  const flags = [...bunFlags];
  if (ignorePattern) {
    flags.push("--path-ignore-patterns", ignorePattern);
  }

  return { targets: [scan], bunFlags: flags, label: scan };
}

const pkg = process.argv[2] as PackageName;
const separatorIndex = process.argv.indexOf("--");
const extraArgs =
  separatorIndex === -1 ? process.argv.slice(3) : process.argv.slice(separatorIndex + 1);

if (!pkg || !PACKAGES[pkg]) {
  console.error(
    "Usage: test-mongo-env.ts <backend|scripts|sync> -- [bun test flags/paths...]",
  );
  process.exit(2);
}

const { preload, scan } = PACKAGES[pkg];
const preloadPath = resolve(preload);
const { targets, bunFlags, label } = resolveTestTargets(scan, extraArgs);
const maxSeconds = maxSecondsFor(pkg);
const started = Date.now();
const outputTee = createOutputTee();
let phase: TestRunPhase = "starting-mongo";

function reportTimeout(): never {
  reportSuiteTimeout({
    pkg,
    label,
    maxSeconds: maxSeconds ?? 0,
    startedMs: started,
    phase,
    outputLines: outputTee.lines,
  });
}

const mongoDeadline = remainingSeconds(maxSeconds, started);
let server: MongoMemoryReplSet;

try {
  const createMongo = MongoMemoryReplSet.create({
    replSet: { count: 1, name: "compass-test", storageEngine: "wiredTiger" },
  });
  server =
    mongoDeadline === undefined
      ? await createMongo
      : await withDeadline(createMongo, mongoDeadline);
} catch {
  reportTimeout();
}

phase = "running-tests";
const mongoUri = server.getUri();
const env = backendTestSpawnEnv(mongoUri);

const testTargets = [
  "bun",
  "test",
  "--parallel",
  "--preload",
  preloadPath,
  ...appendPerTestTimeout(bunFlags, pkg),
  ...targets,
];

if (maxSeconds !== undefined) {
  console.log(`Running ${label} (${pkg}, max ${maxSeconds}s)...`);
} else {
  console.log(`Running ${label} (${pkg})...`);
}

try {
  const proc = Bun.spawn(testTargets, {
    env,
    stdout: "pipe",
    stderr: "pipe",
  });

  if (proc.stdout) {
    outputTee.attach(proc.stdout, process.stdout);
  }
  if (proc.stderr) {
    outputTee.attach(proc.stderr, process.stderr);
  }

  const testDeadline = remainingSeconds(maxSeconds, started);
  const code = await waitForProcessExit(proc, testDeadline);

  const elapsedSeconds = (Date.now() - started) / 1000;

  if (code === 124) {
    reportTimeout();
  }

  console.log(`\n${pkg}: finished in ${elapsedSeconds.toFixed(1)}s`);

  reportSlowTestsAfterRun({
    pkg,
    outputLines: outputTee.lines,
    maxSeconds,
    elapsedSeconds,
  });

  if (code !== 0) {
    process.exit(code ?? 1);
  }
} finally {
  await server.stop();
}
