/**
 * Runs web tests with one `bun test` process per file so preload mock.module
 * state is not cleared by Bun's --isolate (which --parallel enables).
 */
import { Glob } from "bun";
import { cpus } from "node:os";
import { resolve } from "node:path";

const PRELOAD = resolve("packages/web/src/__tests__/web.preload.ts");
const SCAN = "packages/web/src/**/*.{test,spec}.{ts,tsx}";

function resolveFiles(extraArgs: string[]): string[] {
  const explicit = extraArgs.filter((arg) => !arg.startsWith("-"));
  if (explicit.length > 0) {
    return explicit.map((arg) => (arg.startsWith("./") ? arg : `./${arg}`));
  }

  return Array.from(new Glob(SCAN).scanSync("."))
    .map((file) => `./${file.replace(/^\.\//, "")}`)
    .sort();
}

const extraArgs = process.argv.slice(2);
const files = resolveFiles(extraArgs);
const bunFlags = extraArgs.filter((arg) => arg.startsWith("-"));

if (files.length === 0) {
  console.error("No test files found");
  process.exit(1);
}

const concurrency = Math.max(1, Math.min(cpus().length, 8));
let nextIndex = 0;
let passedFiles = 0;
const failedFiles: string[] = [];

async function runOne(index: number): Promise<void> {
  const file = files[index]!;
  const label = file.replace(/^\.\/packages\/web\/src\//, "");

  const proc = Bun.spawn(
    ["bun", "test", file, "--preload", PRELOAD, ...bunFlags],
    {
      env: { ...process.env, TZ: "Etc/UTC", NODE_ENV: "test" },
      stdout: "pipe",
      stderr: "pipe",
    },
  );

  const timeout = setTimeout(() => proc.kill(9), 90_000);

  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  clearTimeout(timeout);

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
console.log(`Running ${files.length} web test files...`);

await Promise.all(Array.from({ length: concurrency }, () => worker()));

const seconds = ((Date.now() - started) / 1000).toFixed(1);
console.log(
  `\n\nweb: ${passedFiles}/${files.length} files passed | ${seconds}s`,
);

if (failedFiles.length > 0) {
  console.log(`Failed files:\n  ${failedFiles.join("\n  ")}`);
  process.exit(1);
}
