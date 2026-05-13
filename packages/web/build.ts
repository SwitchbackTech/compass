import { postcssPlugin } from "./plugins/postcss.plugin";
import { execSync } from "node:child_process";
import path from "node:path";

function getBuildHash(): string {
  const fallbackBuildRef = process.env.COMPASS_BUILD_REF || "self-host";
  const compassRepoRoot = path.resolve(import.meta.dir, "../..");

  try {
    const gitWorkTreeRoot = path.resolve(
      execSync("git rev-parse --show-toplevel", {
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim(),
    );

    if (gitWorkTreeRoot !== compassRepoRoot) {
      return fallbackBuildRef;
    }
  } catch {
    return fallbackBuildRef;
  }

  return execSync("git rev-parse --short HEAD", {
    stdio: ["ignore", "pipe", "inherit"],
  })
    .toString()
    .trim();
}

const buildHash = getBuildHash();
const BUILD_VERSION =
  buildHash === "self-host" ? `${Date.now()}-self-host` : buildHash;
const OUTDIR = path.resolve(import.meta.dir, "../../build/web");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// Define process.env as a whole object so both dot and bracket notation work:
// process.env.NODE_ENV and process.env["NODE_ENV"] are both replaced correctly.
const define: Record<string, string> = {
  "process.env": JSON.stringify({
    NODE_ENV: process.env.NODE_ENV || "production",
    API_BASEURL: process.env.BASEURL ?? "",
    GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID || "",
    POSTHOG_KEY: process.env.POSTHOG_KEY || "",
    POSTHOG_HOST: process.env.POSTHOG_HOST || "",
    PORT: process.env.PORT || "3000",
  }),
  BUILD_VERSION: JSON.stringify(BUILD_VERSION),
};

// biome-ignore lint/suspicious/noConsole: Preserve build progress output.
console.log(`Building version ${BUILD_VERSION}...`);

const result = await Bun.build({
  entrypoints: [path.resolve(import.meta.dir, "src/index.html")],
  outdir: OUTDIR,
  target: "browser",
  sourcemap: "external",
  minify: true,
  splitting: false,
  define,
  plugins: [postcssPlugin],
  publicPath: "/",
});

if (!result.success) {
  console.error("Build failed:");
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}

await Bun.write(
  path.join(OUTDIR, "version.json"),
  JSON.stringify({ version: BUILD_VERSION }, null, 2),
);

// biome-ignore lint/suspicious/noConsole: Preserve build progress output.
console.log(`Build complete → ${OUTDIR}`);
// biome-ignore lint/suspicious/noConsole: Preserve build progress output.
console.log(`  ${result.outputs.length} files written`);
