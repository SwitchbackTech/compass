import { existsSync, readdirSync } from "node:fs";
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

type ProjectConfig = {
  cmd: string[];
};

const bunRuntime = (globalThis as unknown as { Bun: BunRuntime }).Bun;

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
    cmd: [
      "bun",
      "test",
      "packages/web/src",
      "--preload",
      "packages/web/src/__tests__/web.bun.preload.ts",
    ],
  },
} satisfies Record<string, ProjectConfig>;

function assertBackendEnvFile() {
  const envFilePath = resolve(process.cwd(), "packages/backend/.env.local");

  if (!existsSync(envFilePath)) {
    return;
  }

  process.env["BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD"] = "true";
}

function getWebTestFiles(directoryPath: string): string[] {
  const testFiles: string[] = [];

  for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = resolve(directoryPath, entry.name);

    if (entry.isDirectory()) {
      testFiles.push(...getWebTestFiles(entryPath));
      continue;
    }

    if (/\.(test|spec)\.[jt]sx?$/.test(entry.name)) {
      testFiles.push(entryPath);
    }
  }

  return testFiles.sort();
}

function runCommand(cmd: string[]) {
  const result = bunRuntime.spawnSync({
    cmd,
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

function runWebProject() {
  const webTestFiles = getWebTestFiles(resolve(process.cwd(), "packages/web/src"));

  for (const [index, testFile] of webTestFiles.entries()) {
    console.log(`[web ${index + 1}/${webTestFiles.length}] ${testFile}`);
    runCommand([
      "bun",
      "test",
      testFile,
      "--preload",
      "packages/web/src/__tests__/web.bun.preload.ts",
    ]);
  }
}

function runProject(projectName: keyof typeof TEST_PROJECTS) {
  if (projectName === "web") {
    runWebProject();
    return;
  }

  runCommand(TEST_PROJECTS[projectName].cmd);
}

function main() {
  assertBackendEnvFile();

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
