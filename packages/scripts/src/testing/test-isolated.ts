/**
 * Runs web tests with one `bun test` process per file so preload mock.module
 * state is not cleared by Bun's --isolate (which --parallel enables).
 */

import { formatSummary, resolveTestFiles, runPool } from "./runner-utils";
import { cpus } from "node:os";
import { resolve } from "node:path";

const PRELOAD = resolve("packages/web/src/__tests__/web.preload.ts");
const SCAN = "packages/web/src/**/*.{test,spec}.{ts,tsx}";

const extraArgs = process.argv.slice(2);
const { files, bunFlags } = resolveTestFiles(SCAN, extraArgs);

if (files.length === 0) {
  console.error("No test files found");
  process.exit(1);
}

const concurrency = Math.max(1, Math.min(cpus().length, 8));
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

const started = Date.now();
console.log(`Running ${files.length} web test files...`);

await runPool(concurrency, files.length, runOne);

console.log(`\n\n${formatSummary("web", passedFiles, files.length, started)}`);

if (failedFiles.length > 0) {
  console.log(`Failed files:\n  ${failedFiles.join("\n  ")}`);
  process.exit(1);
}
