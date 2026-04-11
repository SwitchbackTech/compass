import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { loadBackendEnvForBuild } from "../scripts/src/common/build-env";

const OUTDIR = path.resolve(import.meta.dir, "../../build/backend");
const { buildEnvironment, envPath } = await loadBackendEnvForBuild(
  import.meta.dir,
);

await rm(OUTDIR, { force: true, recursive: true });
await mkdir(OUTDIR, { recursive: true });
await copyFile(envPath, path.join(OUTDIR, ".env"));

console.log(`Building backend (${buildEnvironment}) with ${envPath}...`);

const result = await Bun.build({
  entrypoints: [path.resolve(import.meta.dir, "src/app.ts")],
  outdir: OUTDIR,
  target: "bun",
  format: "esm",
  sourcemap: "external",
  minify: false,
  splitting: false,
});

if (!result.success) {
  console.error("Build failed:");
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}

console.log(`Build complete -> ${OUTDIR}`);
console.log(`  ${result.outputs.length} files written`);
