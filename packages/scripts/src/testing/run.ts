import { existsSync, readdirSync, statSync } from "node:fs";
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

type ProjectConfig = {
  cmd: string[];
  cwd?: string;
};

const bunRuntime = (globalThis as unknown as { Bun: BunRuntime }).Bun;
const WEB_ROOT = resolve(process.cwd(), "packages/web");
const WEB_SRC = resolve(WEB_ROOT, "src");
const WEB_TEST_FILE_PATTERN = /\.(spec|test)\.[tj]sx?$/;
const DEFAULT_WEB_TEST_BATCH_SIZE = 3;

const TEST_PROJECTS = {
  backend: {
    cmd: ["./node_modules/.bin/jest", "--selectProjects", "backend"],
  },
  core: {
    cmd: [
      "bun",
      "test",
      "packages/core/src",
      "--preload",
      "packages/scripts/src/testing/core.preload.ts",
    ],
  },
  scripts: {
    cmd: ["./node_modules/.bin/jest", "scripts"],
  },
  web: {
    cmd: [],
  },
} satisfies Record<string, ProjectConfig>;

function findWebTestFiles(dir: string): string[] {
  return readdirSync(dir)
    .flatMap((entry) => {
      const path = resolve(dir, entry);
      const stats = statSync(path);

      if (stats.isDirectory()) {
        return findWebTestFiles(path);
      }

      if (!WEB_TEST_FILE_PATTERN.test(entry)) {
        return [];
      }

      return relative(WEB_ROOT, path);
    })
    .sort();
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function getWebTestBatchSize() {
  const configuredBatchSize = Number(process.env["WEB_TEST_BATCH_SIZE"]);

  if (Number.isInteger(configuredBatchSize) && configuredBatchSize > 0) {
    return configuredBatchSize;
  }

  return DEFAULT_WEB_TEST_BATCH_SIZE;
}

function assertBackendConfigFile() {
  const configFilePath = resolve(process.cwd(), "compass.yaml");

  if (!existsSync(configFilePath)) {
    return;
  }

  process.env["BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD"] = "true";
}

function runCommand(cmd: string[], cwd = process.cwd()) {
  const result = bunRuntime.spawnSync({
    cmd,
    cwd,
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

function runProject(projectName: keyof typeof TEST_PROJECTS) {
  if (projectName === "web") {
    const testFileBatches = chunk(
      findWebTestFiles(WEB_SRC),
      getWebTestBatchSize(),
    );

    for (const testFiles of testFileBatches) {
      runCommand(["bun", "test", "--cwd", WEB_ROOT, ...testFiles]);
    }
    return;
  }

  runCommand(TEST_PROJECTS[projectName].cmd);
}

function main() {
  assertBackendConfigFile();

  const requestedProject = process.argv[2] as
    | keyof typeof TEST_PROJECTS
    | undefined;

  if (requestedProject) {
    runProject(requestedProject);
    return;
  }

  for (const projectName of Object.keys(TEST_PROJECTS) as Array<
    keyof typeof TEST_PROJECTS
  >) {
    runProject(projectName);
  }
}

main();
