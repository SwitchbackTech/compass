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
import { Glob } from "bun";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { backendTestSpawnEnv } from "./backend-test-env";
import { resolve } from "node:path";

type PackageName = "backend" | "scripts" | "sync";

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
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\n${pkg}: finished in ${seconds}s`);

  if (code !== 0) {
    process.exit(code ?? 1);
  }
} finally {
  await server.stop();
}
