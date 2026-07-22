/**
 * Boots one in-memory Mongo replica set and runs package tests with one
 * `bun test` process per file so preload mocks stay intact (Bun's --isolate
 * clears mock.module state from preload between files in the same worker).
 *
 * Usage:
 *   bun test-with-mongo.ts <backend|scripts|sync> [paths/globs/flags...]
 */
import { Glob } from "bun";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { cpus } from "node:os";
import { resolve } from "node:path";
import { backendTestSpawnEnv } from "./backend-test-env";

type PackageName = "backend" | "scripts" | "sync";

const PACKAGES: Record<
  PackageName,
  { preload: string; scan: string }
> = {
  backend: {
    preload: "packages/backend/src/__tests__/backend.preload.ts",
    scan: "packages/backend/src/**/*.{test,spec}.{ts,tsx}",
  },
  scripts: {
    preload: "packages/scripts/src/testing/scripts.preload.ts",
    scan: "packages/scripts/src/**/*.{test,spec}.{ts,tsx}",
  },
  sync: {
    preload: "packages/sync/src/__tests__/sync.preload.ts",
    scan: "packages/sync/src/**/*.{test,spec}.{ts,tsx}",
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
      bunFlags.push(arg, extraArgs[i + 1]!);
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

    explicitPaths.push(
      ...matches.map((match) => `./${match.replace(/^\.\//, "")}`),
    );
  }

  return { bunFlags, ignorePattern, explicitPaths };
}

function resolveFiles(
  scan: string,
  extraArgs: string[],
): { files: string[]; bunFlags: string[] } {
  const { bunFlags, ignorePattern, explicitPaths } = parseExtraArgs(extraArgs);

  let files =
    explicitPaths.length > 0
      ? explicitPaths
      : Array.from(new Glob(scan).scanSync(".")).map(
          (file) => `./${file.replace(/^\.\//, "")}`,
        );

  if (ignorePattern?.includes(".db.test.")) {
    files = files.filter((file) => !file.includes(".db.test."));
  }

  files.sort();

  if (files.length === 0) {
    console.error("No test files found");
    process.exit(1);
  }

  return { files, bunFlags };
}

const pkg = process.argv[2] as PackageName;
const extraArgs = process.argv.slice(3);

if (!pkg || !PACKAGES[pkg]) {
  console.error(
    "Usage: test-with-mongo.ts <backend|scripts|sync> [paths/globs/flags...]",
  );
  process.exit(2);
}

const { preload, scan } = PACKAGES[pkg];
const preloadPath = resolve(preload);
const { files, bunFlags } = resolveFiles(scan, extraArgs);

const server = await MongoMemoryReplSet.create({
  replSet: { count: 1, name: "compass-test", storageEngine: "wiredTiger" },
});
const mongoUri = server.getUri();
const env = backendTestSpawnEnv(mongoUri);

const concurrency = Math.max(1, Math.min(cpus().length - 1, 8));
let nextIndex = 0;
let passedFiles = 0;
const failedFiles: string[] = [];

async function runOne(index: number): Promise<void> {
  const file = files[index]!;
  const label = file.replace(/^\.\/packages\/[^/]+\/src\//, "");

  const proc = Bun.spawn(
    ["bun", "test", "--preload", preloadPath, ...bunFlags, file],
    { env, stdout: "pipe", stderr: "pipe" },
  );

  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (code === 0) {
    passedFiles++;
    process.stdout.write(".");
  } else {
    failedFiles.push(label);
    process.stdout.write("F");
    console.log(`\n----- FAIL ${label} -----`);
    console.log(`${stdout}\n${stderr}`.trimEnd());
    console.log(`----- end ${label} -----`);
  }
}

async function worker(): Promise<void> {
  while (nextIndex < files.length) {
    const index = nextIndex++;
    await runOne(index);
  }
}

const started = Date.now();
console.log(`Running ${files.length} ${pkg} test files...`);

try {
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
} finally {
  await server.stop();
}

const seconds = ((Date.now() - started) / 1000).toFixed(1);
console.log(
  `\n\n${pkg}: ${passedFiles}/${files.length} files passed | ${seconds}s`,
);

if (failedFiles.length > 0) {
  console.log(`Failed files:\n  ${failedFiles.join("\n  ")}`);
  process.exit(1);
}
