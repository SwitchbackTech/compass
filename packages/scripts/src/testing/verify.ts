import { execSync } from "node:child_process";

/**
 * Smart verify script for AI coding loops.
 * Detects which packages changed via git diff and runs the minimum
 * necessary test suites plus type-check.
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

const PACKAGE_PREFIXES: Record<string, string> = {
  "packages/core/": "core",
  "packages/web/": "web",
  "packages/backend/": "backend",
  "packages/scripts/": "scripts",
};

const TEST_COMMANDS: Record<string, string[]> = {
  core: ["bun", "packages/scripts/src/testing/run.ts", "core"],
  web: ["./node_modules/.bin/jest", "web"],
  backend: ["./node_modules/.bin/jest", "--selectProjects", "backend"],
  scripts: ["./node_modules/.bin/jest", "scripts"],
};

function getChangedPackages(): string[] {
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

function mapFilesToPackages(files: string[]): string[] {
  const packages = new Set<string>();
  for (const file of files) {
    for (const [prefix, pkg] of Object.entries(PACKAGE_PREFIXES)) {
      if (file.startsWith(prefix)) {
        packages.add(pkg);
      }
    }
  }
  return Array.from(packages);
}

function runCommand(cmd: string[], label: string): boolean {
  console.log(`\n→ ${label}`);
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
  const args = process.argv.slice(2) as Array<keyof typeof TEST_COMMANDS>;

  let packagesToRun: string[];

  if (args.length > 0) {
    // Explicit packages passed as arguments
    const invalid = args.filter((a) => !TEST_COMMANDS[a]);
    if (invalid.length > 0) {
      console.error(
        `Unknown package(s): ${invalid.join(", ")}. Valid: core, web, backend, scripts`,
      );
      process.exit(1);
    }
    packagesToRun = args;
    console.log(`Running: ${packagesToRun.join(" → ")} → type-check`);
  } else {
    // Auto-detect from git diff
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
    const cmd = TEST_COMMANDS[pkg];
    if (!cmd) continue;
    const ok = runCommand(cmd, `test:${pkg}`);
    if (!ok) {
      failed.push(`test:${pkg}`);
    }
  }

  const typeCheckOk = runTypeCheck();
  if (!typeCheckOk) {
    failed.push("type-check");
  }

  if (failed.length > 0) {
    console.error(`\nFailed: ${failed.join(", ")}`);
    process.exit(1);
  }

  console.log("\n✓ All checks passed");
}

main();
