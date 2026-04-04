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

const SCRIPT_TEST_COMMANDS = [
  [
    "bun",
    "test",
    "packages/scripts/src/cli.test.ts",
    "packages/scripts/src/common/zod-to-mongo-schema.test.ts",
    "--preload",
    "packages/scripts/src/testing/scripts.unit.preload.ts",
  ],
  [
    "bun",
    "test",
    "packages/scripts/src/__tests__/integration",
    "--preload",
    "packages/scripts/src/testing/scripts.preload.ts",
  ],
] as const;

for (const cmd of SCRIPT_TEST_COMMANDS) {
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
