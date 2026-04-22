import { readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

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

const WEB_ROOT = resolve(process.cwd(), "packages/web");
const WEB_SRC = resolve(WEB_ROOT, "src");
const TEST_FILE_PATTERN = /\.(spec|test)\.[tj]sx?$/;

function findTestFiles(dir: string): string[] {
  return readdirSync(dir)
    .flatMap((entry) => {
      const path = resolve(dir, entry);
      const stats = statSync(path);

      if (stats.isDirectory()) {
        return findTestFiles(path);
      }

      if (!TEST_FILE_PATTERN.test(entry)) {
        return [];
      }

      return relative(WEB_ROOT, path);
    })
    .sort();
}

function runTestFile(testFile: string) {
  const result = bunRuntime.spawnSync({
    cmd: [process.execPath, "test", "--cwd", WEB_ROOT, testFile],
    cwd: process.cwd(),
    env: {
      ...process.env,
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

for (const testFile of findTestFiles(WEB_SRC)) {
  runTestFile(testFile);
}
