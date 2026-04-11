import { execSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadBackendEnvForBuild } from "../scripts/src/common/build-env";
import { postcssPlugin } from "./plugins/postcss.plugin";

const { buildEnvironment, envPath } = await loadBackendEnvForBuild(
  import.meta.dir,
);
const GIT_HASH = execSync("git rev-parse --short HEAD").toString().trim();
const BUILD_VERSION = `${Date.now()}-${GIT_HASH}`;
const OUTDIR = path.resolve(import.meta.dir, "../../build/web");
const requiredPublicEnv = [
  "COMPASS_PUBLIC_API_BASEURL",
  "COMPASS_PUBLIC_GOOGLE_CLIENT_ID",
] as const;

process.env.NODE_ENV = "production";

for (const key of requiredPublicEnv) {
  if (!process.env[key] || process.env[key] === "undefined") {
    throw new Error(`Missing required web build env: ${key}`);
  }
}

await rm(OUTDIR, { force: true, recursive: true });
await mkdir(OUTDIR, { recursive: true });

console.log(`Building web (${buildEnvironment}) with ${envPath}...`);
console.log(`Building version ${BUILD_VERSION}...`);

const result = await Bun.build({
  entrypoints: [path.resolve(import.meta.dir, "src/index.html")],
  outdir: OUTDIR,
  target: "browser",
  sourcemap: "external",
  minify: true,
  splitting: false,
  env: "inline",
  define: {
    BUILD_VERSION: JSON.stringify(BUILD_VERSION),
  },
  plugins: [postcssPlugin],
});

if (!result.success) {
  console.error("Build failed:");
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}

await writeFile(
  path.join(OUTDIR, "version.json"),
  JSON.stringify({ version: BUILD_VERSION }, null, 2),
);

console.log(`Build complete → ${OUTDIR}`);
console.log(`  ${result.outputs.length} files written`);
