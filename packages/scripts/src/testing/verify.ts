import { execSync } from "node:child_process";

/**
 * Smart verify script for AI coding loops.
 * Detects which packages changed via git diff and runs the minimum
 * necessary test suites plus type-check.
 *
 * All test execution is delegated to run.ts — no commands are duplicated here.
 *
 * Usage:
 *   bun run verify              — auto-detect from git diff
 *   bun run verify web          — run web suite + type-check
 *   bun run verify core web     — run specific suites + type-check
 */

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

const VALID_PACKAGES = ["core", "web", "backend", "scripts"] as const;
type Package = (typeof VALID_PACKAGES)[number];

const PACKAGE_PREFIXES: Record<string, Package> = {
  "packages/core/": "core",
  "packages/web/": "web",
  "packages/backend/": "backend",
  "packages/scripts/": "scripts",
};

function getChangedPackages(): Package[] {
  try {
    const output = execSync("git diff --name-only HEAD", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (!output) {
      // Fall back to staged + unstaged changes
      const staged = execSync("git diff --name-only --cached", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      const unstaged = execSync("git diff --name-only", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      const combined = [staged, unstaged].filter(Boolean).join("\n");
      if (!combined) return [];
      return mapFilesToPackages(combined.split("\n"));
    }

    return mapFilesToPackages(output.split("\n"));
  } catch {
    return [];
  }
}

function mapFilesToPackages(files: string[]): Package[] {
  const packages = new Set<Package>();
  for (const file of files) {
    for (const [prefix, pkg] of Object.entries(PACKAGE_PREFIXES)) {
      if (file.startsWith(prefix)) {
        packages.add(pkg);
      }
    }
  }
  return Array.from(packages);
}

function runPackage(pkg: Package): boolean {
  console.log(`\n→ test:${pkg}`);
  const result = bunRuntime.spawnSync({
    cmd: ["bun", "packages/scripts/src/testing/run.ts", pkg],
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
  return result.exitCode === 0;
}

function runTypeCheck(): boolean {
  console.log("\n→ type-check");
  const result = bunRuntime.spawnSync({
    cmd: ["bunx", "tsc", "--noEmit"],
    cwd: process.cwd(),
    env: {
      ...process.env,
      TZ: process.env["TZ"] ?? "Etc/UTC",
    },
    stderr: "inherit",
    stdin: "inherit",
    stdout: "inherit",
  });
  return result.exitCode === 0;
}

function main() {
  const args = process.argv.slice(2);

  let packagesToRun: Package[];

  if (args.length > 0) {
    const invalid = args.filter((a) => !VALID_PACKAGES.includes(a as Package));
    if (invalid.length > 0) {
      console.error(
        `Unknown package(s): ${invalid.join(", ")}. Valid: ${VALID_PACKAGES.join(", ")}`,
      );
      process.exit(1);
    }
    packagesToRun = args as Package[];
    console.log(`Running: ${packagesToRun.join(" → ")} → type-check`);
  } else {
    packagesToRun = getChangedPackages();

    if (packagesToRun.length === 0) {
      console.log(
        "No changed packages detected — falling back to: core → web → type-check",
      );
      packagesToRun = ["core", "web"];
    } else {
      console.log(
        `Detected changes in: ${packagesToRun.join(", ")}\nRunning: ${packagesToRun.join(" → ")} → type-check`,
      );
    }
  }

  const failed: string[] = [];

  for (const pkg of packagesToRun) {
    if (!runPackage(pkg)) {
      failed.push(`test:${pkg}`);
    }
  }

  if (!runTypeCheck()) {
    failed.push("type-check");
  }

  if (failed.length > 0) {
    console.error(`\nFailed: ${failed.join(", ")}`);
    process.exit(1);
  }

  console.log("\n✓ All checks passed");
}

main();
