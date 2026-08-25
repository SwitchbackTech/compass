import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

/**
 * Local required-check subset for AI coding loops.
 *
 * Detects packages from the merge-base vs origin/main plus the working tree,
 * then runs the matching `test:<pkg>` scripts plus type-check, lint, and knip.
 * Web or e2e/ changes also select Playwright a11y and e2e, unless Chromium is
 * missing — in that case the helper skips those checks and reports incomplete
 * CI parity instead of a silent pass.
 *
 * Usage:
 *   bun run verify              — auto-detect from git
 *   bun run verify web          — run web suite + required static checks
 *   bun run verify core web     — run specific suites + required static checks
 */

type BunRuntime = {
  spawnSync(input: {
    cmd: string[];
    cwd?: string;
    env?: Record<string, string | undefined>;
    stderr?: "inherit" | "pipe";
    stdin?: "inherit" | "pipe";
    stdout?: "inherit" | "pipe";
  }): {
    exitCode: number;
    stdout?: Uint8Array | string;
    stderr?: Uint8Array | string;
  };
};

const bunRuntime = (globalThis as unknown as { Bun: BunRuntime }).Bun;

export const VALID_PACKAGES = [
  "core",
  "sync",
  "web",
  "backend",
  "scripts",
] as const;
export type Package = (typeof VALID_PACKAGES)[number];

const PACKAGE_PREFIXES: Record<string, Package> = {
  "packages/core/": "core",
  "packages/sync/": "sync",
  "packages/web/": "web",
  "packages/backend/": "backend",
  "packages/scripts/": "scripts",
};

const MERGE_BASE_REFS = ["origin/main", "main", "master"] as const;
export const PLAYWRIGHT_INSTALL_COMMAND = "bunx playwright install chromium";

export type GitCommands = {
  hasRef(ref: string): boolean;
  fetch(remote: string, branch: string): void;
  mergeBase(a: string, b: string): string | null;
  diffNameOnly(args: string[]): string[];
  untrackedNames(): string[];
};

export type SpawnResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type SpawnFn = (
  cmd: string[],
  options?: {
    env?: Record<string, string | undefined>;
    stdio?: "inherit" | "pipe";
  },
) => SpawnResult;

export type Logger = {
  log(message: string): void;
  error(message: string): void;
};

export type PlannedCheck = {
  id: string;
  cmd: string[];
};

export type PlannedSkip = {
  id: string;
  reason: string;
};

export type VerifyPlan = {
  packages: Package[];
  checks: PlannedCheck[];
  skips: PlannedSkip[];
  playwrightSelected: boolean;
  ciParityComplete: boolean;
};

export type VerifyDeps = {
  git: GitCommands;
  spawn: SpawnFn;
  log: Logger;
  chromiumAvailable?: (spawn: SpawnFn) => boolean;
};

export function mapFilesToPackages(files: string[]): Package[] {
  const packages = new Set<Package>();
  for (const file of files) {
    if (file.startsWith("e2e/")) {
      packages.add("web");
      continue;
    }
    for (const [prefix, pkg] of Object.entries(PACKAGE_PREFIXES)) {
      if (file.startsWith(prefix)) {
        packages.add(pkg);
      }
    }
  }
  return VALID_PACKAGES.filter((pkg) => packages.has(pkg));
}

export function playwrightTouched(
  files: string[],
  packages: Package[],
): boolean {
  if (packages.includes("web")) return true;
  return files.some(
    (file) => file.startsWith("packages/web/") || file.startsWith("e2e/"),
  );
}

export function chromiumInstallLocationFromDryRun(
  output: string,
): string | null {
  const match = output.match(
    /playwright chromium[^\n]*\n[ \t]+Install location:[ \t]+(\S+)/i,
  );
  return match?.[1] ?? null;
}

export function detectChromiumAvailable(spawn: SpawnFn): boolean {
  const result = spawn(
    ["bunx", "playwright", "install", "--dry-run", "chromium"],
    { stdio: "pipe" },
  );
  const output = `${result.stdout}\n${result.stderr}`;
  const location = chromiumInstallLocationFromDryRun(output);
  return location != null && existsSync(location);
}

export function planVerify(input: {
  packages: Package[];
  files: string[];
  playwrightChromiumAvailable: boolean;
}): VerifyPlan {
  const packages = VALID_PACKAGES.filter((pkg) => input.packages.includes(pkg));
  const checks: PlannedCheck[] = packages.map((pkg) => ({
    id: `test:${pkg}`,
    cmd: ["bun", "run", `test:${pkg}`],
  }));

  checks.push({ id: "type-check", cmd: ["bun", "run", "type-check"] });
  checks.push({ id: "lint", cmd: ["bun", "run", "lint"] });
  checks.push({ id: "knip", cmd: ["bun", "run", "knip"] });

  const skips: PlannedSkip[] = [];
  const playwrightSelected = playwrightTouched(input.files, packages);

  if (playwrightSelected) {
    if (input.playwrightChromiumAvailable) {
      checks.push({ id: "test:a11y", cmd: ["bun", "run", "test:a11y"] });
      checks.push({ id: "test:e2e", cmd: ["bun", "run", "test:e2e"] });
    } else {
      const reason = `Playwright Chromium missing; install with: ${PLAYWRIGHT_INSTALL_COMMAND}`;
      skips.push({ id: "test:a11y", reason });
      skips.push({ id: "test:e2e", reason });
    }
  }

  return {
    packages,
    checks,
    skips,
    playwrightSelected,
    ciParityComplete: skips.length === 0,
  };
}

export function resolveMergeBase(git: GitCommands): {
  sha: string;
  ref: string;
} {
  for (const ref of MERGE_BASE_REFS) {
    if (ref === "origin/main" && !git.hasRef(ref)) {
      try {
        git.fetch("origin", "main");
      } catch {
        // Fall through to main/master when origin/main cannot be fetched.
      }
    }
    if (!git.hasRef(ref)) continue;
    const sha = git.mergeBase("HEAD", ref);
    if (sha) return { sha, ref };
  }

  throw new Error(
    "Could not resolve merge-base against origin/main, main, or master. Fetch origin/main instead of comparing against HEAD.",
  );
}

export function collectChangedFiles(
  git: GitCommands,
  mergeBase: string,
): string[] {
  const committed = git.diffNameOnly([`${mergeBase}...HEAD`]);
  const staged = git.diffNameOnly(["--cached"]);
  const unstaged = git.diffNameOnly([]);
  const untracked = git.untrackedNames();
  return uniquePaths([...committed, ...staged, ...unstaged, ...untracked]);
}

export function defaultGit(): GitCommands {
  return {
    hasRef(ref: string): boolean {
      try {
        execGit(["rev-parse", "--verify", "--quiet", ref]);
        return true;
      } catch {
        return false;
      }
    },
    fetch(remote: string, branch: string): void {
      execGit(["fetch", remote, branch]);
    },
    mergeBase(a: string, b: string): string | null {
      try {
        const sha = execGit(["merge-base", a, b]).trim();
        return sha.length > 0 ? sha : null;
      } catch {
        return null;
      }
    },
    diffNameOnly(args: string[]): string[] {
      return splitLines(execGit(["diff", "--name-only", ...args]));
    },
    untrackedNames(): string[] {
      return splitLines(
        execGit(["ls-files", "--others", "--exclude-standard"]),
      );
    },
  };
}

export function defaultSpawn(): SpawnFn {
  return (cmd, options) => {
    const inherit = options?.stdio !== "pipe";
    const result = bunRuntime.spawnSync({
      cmd,
      cwd: process.cwd(),
      env: options?.env ?? { ...process.env },
      stderr: inherit ? "inherit" : "pipe",
      stdin: inherit ? "inherit" : "pipe",
      stdout: inherit ? "inherit" : "pipe",
    });
    return {
      exitCode: result.exitCode,
      stdout: decodeSpawnOutput(result.stdout),
      stderr: decodeSpawnOutput(result.stderr),
    };
  };
}

export function runVerify(
  args: string[],
  deps: VerifyDeps = {
    git: defaultGit(),
    spawn: defaultSpawn(),
    log: { log: console.log, error: console.error },
  },
): number {
  const { git, spawn, log } = deps;
  const chromiumAvailable = deps.chromiumAvailable ?? detectChromiumAvailable;

  let packages: Package[];
  let files: string[] = [];
  let mergeBase: { sha: string; ref: string } | null = null;

  if (args.length > 0) {
    const invalid = args.filter(
      (arg) => !VALID_PACKAGES.includes(arg as Package),
    );
    if (invalid.length > 0) {
      log.error(
        `Unknown package(s): ${invalid.join(", ")}. Valid: ${VALID_PACKAGES.join(", ")}`,
      );
      return 1;
    }
    packages = args as Package[];
  } else {
    try {
      mergeBase = resolveMergeBase(git);
    } catch (error) {
      log.error(error instanceof Error ? error.message : String(error));
      return 1;
    }
    files = collectChangedFiles(git, mergeBase.sha);
    packages = mapFilesToPackages(files);
    log.log(`merge-base: ${mergeBase.sha} (${mergeBase.ref})`);
    log.log(
      `files used for detection (${files.length}): ${
        files.length > 0 ? files.join(", ") : "(none)"
      }`,
    );
    if (packages.length === 0) {
      log.log("no packages detected");
    } else {
      log.log(`Detected changes in: ${packages.join(", ")}`);
    }
  }

  const detectionFiles =
    args.length > 0 ? packagesToSyntheticFiles(packages) : files;
  const needsPlaywright = playwrightTouched(detectionFiles, packages);
  const plan = planVerify({
    packages,
    files: detectionFiles,
    playwrightChromiumAvailable: needsPlaywright
      ? chromiumAvailable(spawn)
      : true,
  });

  log.log(`Running: ${plan.checks.map((check) => check.id).join(" → ")}`);
  if (plan.skips.length > 0) {
    for (const skip of plan.skips) {
      log.log(`Skipping ${skip.id}: ${skip.reason}`);
    }
  }

  const failed: string[] = [];
  for (const check of plan.checks) {
    log.log(`\n→ ${check.id}`);
    const inheritIo = check.id !== "test:a11y" && check.id !== "test:e2e";
    const result = spawn(check.cmd, {
      env: spawnEnvFor(check.id),
      stdio: inheritIo ? "inherit" : "pipe",
    });
    if (!inheritIo) {
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
    }
    if (result.exitCode !== 0) {
      if (isMissingPlaywrightBrowser(result, check.id)) {
        plan.skips.push({
          id: check.id,
          reason: `Playwright Chromium missing; install with: ${PLAYWRIGHT_INSTALL_COMMAND}`,
        });
        plan.ciParityComplete = false;
        log.log(
          `Skipping ${check.id}: Playwright Chromium missing; install with: ${PLAYWRIGHT_INSTALL_COMMAND}`,
        );
        continue;
      }
      failed.push(check.id);
    }
  }

  log.log("\nSummary");
  log.log(
    `Selected packages: ${plan.packages.length > 0 ? plan.packages.join(", ") : "(none)"}`,
  );
  log.log(
    `Checks run: ${plan.checks.map((check) => check.id).join(", ") || "(none)"}`,
  );
  if (plan.skips.length > 0) {
    log.log(
      `Checks skipped: ${plan.skips.map((skip) => `${skip.id} (${skip.reason})`).join("; ")}`,
    );
  } else {
    log.log("Checks skipped: (none)");
  }

  if (failed.length > 0) {
    log.error(`\nFailed: ${failed.join(", ")}`);
    return 1;
  }

  if (!plan.ciParityComplete) {
    const reasons = uniquePaths(plan.skips.map((skip) => skip.reason));
    log.log(
      `\n✓ selected checks passed; CI parity incomplete: ${reasons.join("; ")}`,
    );
    return 0;
  }

  log.log("\n✓ All checks passed");
  return 0;
}

function packagesToSyntheticFiles(packages: Package[]): string[] {
  return packages.map((pkg) => `packages/${pkg}/src/changed.ts`);
}

function splitLines(output: string): string[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function spawnEnvFor(checkId: string): Record<string, string | undefined> {
  const timezone = process.env["TZ"] ?? "Etc/UTC";
  if (
    checkId.startsWith("test:") &&
    !checkId.startsWith("test:a11y") &&
    checkId !== "test:e2e"
  ) {
    return { ...process.env, NODE_ENV: "test", TZ: timezone };
  }
  if (checkId === "test:a11y" || checkId === "test:e2e") {
    return playwrightEnv(timezone);
  }
  return { ...process.env, TZ: timezone };
}

function playwrightEnv(timezone: string): Record<string, string | undefined> {
  // Playwright's Bun web server reports a color-env conflict when the parent
  // process forces ANSI colors, and Node 26 reports its known module-loader
  // deprecation. These are upstream runtime diagnostics, not test failures;
  // remove only those two messages from this verification subprocess.
  const nodeOptions = [process.env["NODE_OPTIONS"], "--disable-warning=DEP0205"]
    .filter(Boolean)
    .join(" ");
  const {
    FORCE_COLOR: _forceColor,
    NO_COLOR: _noColor,
    ...processEnvWithoutColorOverrides
  } = process.env;
  return {
    ...processEnvWithoutColorOverrides,
    TZ: timezone,
    NODE_OPTIONS: nodeOptions,
  };
}

function isMissingPlaywrightBrowser(
  result: SpawnResult,
  checkId: string,
): boolean {
  if (checkId !== "test:a11y" && checkId !== "test:e2e") return false;
  const output = `${result.stdout}\n${result.stderr}`.toLowerCase();
  return (
    output.includes("executable doesn't exist") ||
    output.includes("browserType.launch") ||
    output.includes("playwright chromium") ||
    (output.includes("chromium") && output.includes("install"))
  );
}

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths.filter(Boolean))];
}

function execGit(args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function decodeSpawnOutput(value: Uint8Array | string | undefined): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return new TextDecoder().decode(value);
}

if (import.meta.main) {
  process.exit(runVerify(process.argv.slice(2)));
}
