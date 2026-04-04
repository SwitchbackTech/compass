import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

type BunRuntime = {
  spawnSync(input: {
    cmd: string[];
    cwd?: string;
    env?: Record<string, string | undefined>;
    stderr?: "inherit";
    stdin?: "inherit";
    stdout?: "inherit";
  }): { exitCode: number };
};

const bunRuntime = (globalThis as unknown as { Bun: BunRuntime }).Bun;

const BACKEND_BUN_UNIT_TESTS = [
  "packages/backend/src/__tests__/mocks.gcal/factories/gcal.event.factory.test.ts",
  "packages/backend/src/common/middleware/promise.middleware.test.ts",
  "packages/backend/src/common/services/gcal/gcal.util.test.ts",
  "packages/backend/src/event/classes/compass.event.parser.test.ts",
  "packages/backend/src/event/classes/gcal.event.rrule.test.ts",
  "packages/backend/src/event/services/recur/recur.general.test.ts",
  "packages/backend/src/event/services/recur/recur.month.test.ts",
  "packages/backend/src/event/services/recur/recur.week.test.ts",
  "packages/backend/src/event/services/recur/util/recur.util.test.ts",
  "packages/backend/src/sync/services/import/sync.import.util.test.ts",
] as const;

async function collectBackendTestFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const fullPath = resolve(dir, entry.name);

      if (entry.isDirectory()) {
        return collectBackendTestFiles(fullPath);
      }

      if (fullPath.endsWith(".test.ts") || fullPath.endsWith(".test.tsx")) {
        return [fullPath];
      }

      return [];
    }),
  );

  return files.flat();
}

function runCommand(cmd: string[]): void {
  const result = bunRuntime.spawnSync({
    cmd: [...cmd],
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "test",
      TZ: process.env["TZ"] ?? "Etc/UTC",
    },
    stderr: "inherit",
    stdin: "inherit",
    stdout: "inherit",
  });

  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }
}

async function main(): Promise<void> {
  runCommand([
    "bun",
    "test",
    ...BACKEND_BUN_UNIT_TESTS,
    "--preload",
    "packages/scripts/src/testing/backend.unit.preload.ts",
  ]);

  const allBackendTests = await collectBackendTestFiles(
    resolve(process.cwd(), "packages/backend/src"),
  );
  const bunUnitTests = new Set(
    BACKEND_BUN_UNIT_TESTS.map((path) => resolve(process.cwd(), path)),
  );
  const jestTests = allBackendTests
    .filter((path) => !bunUnitTests.has(path))
    .sort();

  runCommand([
    "./node_modules/.bin/jest",
    "--selectProjects",
    "backend",
    "--runTestsByPath",
    ...jestTests,
  ]);
}

await main();
