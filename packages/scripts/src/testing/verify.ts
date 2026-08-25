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

const VALID_PACKAGES = ["core", "sync", "web", "backend", "scripts"] as const;
export type Package = (typeof VALID_PACKAGES)[number];

const PACKAGE_PREFIXES: Record<string, Package> = Object.fromEntries(
  VALID_PACKAGES.map((pkg) => [`packages/${pkg}/`, pkg]),
);

const MERGE_BASE_REFS = ["origin/main", "main", "master"] as const;
export const PLAYWRIGHT_INSTALL_COMMAND = "bunx playwright install chromium";
const CHROMIUM_MISSING_REASON = `Playwright Chromium missing; install with: ${PLAYWRIGHT_INSTALL_COMMAND}`;
const PLAYWRIGHT_CHECKS = ["test:a11y", "test:e2e"] as const;

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
};

export type VerifyDeps = {
  git: GitCommands;
  spawn: SpawnFn;
  log: Logger;
  chromiumAvailable?: (spawn: SpawnFn) => boolean;
};

function isPackage(value: string): value is Package {
  return (VALID_PACKAGES as readonly string[]).includes(value);
}

function isPlaywrightCheck(checkId: string): boolean {
  return (PLAYWRIGHT_CHECKS as readonly string[]).includes(checkId);
}

function combinedSpawnOutput(result: SpawnResult): string {
  return `${result.stdout}\n${result.stderr}`;
}

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

export function chromiumInstallLocationFromDryRun(
  output: string,
): string | null {
  const match = output.match(
    /playwright chromium[^\n]*\n[ \t]+Install location:[ \t]+(\S+)/i,
  );
  return match?.[1] ?? null;
}

function detectChromiumAvailable(spawn: SpawnFn): boolean {
  const result = spawn(
    ["bunx", "playwright", "install", "--dry-run", "chromium"],
    { stdio: "pipe" },
  );
  const location = chromiumInstallLocationFromDryRun(
    combinedSpawnOutput(result),
  );
  return location != null && existsSync(location);
}

export function planVerify(input: {
  packages: Package[];
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
  const playwrightSelected = packages.includes("web");

  if (playwrightSelected) {
    if (input.playwrightChromiumAvailable) {
      for (const id of PLAYWRIGHT_CHECKS) {
        checks.push({ id, cmd: ["bun", "run", id] });
      }
    } else {
      for (const id of PLAYWRIGHT_CHECKS) {
        skips.push({ id, reason: CHROMIUM_MISSING_REASON });
      }
    }
  }

  return {
    packages,
    checks,
    skips,
    playwrightSelected,
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
  return unique([
    ...git.diffNameOnly([`${mergeBase}...HEAD`]),
    ...git.diffNameOnly(["--cached"]),
    ...git.diffNameOnly([]),
    ...git.untrackedNames(),
  ]);
}

function defaultGit(): GitCommands {
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

function defaultSpawn(): SpawnFn {
  return (cmd, options) => {
    const inherit = options?.stdio !== "pipe";
    const result = Bun.spawnSync({
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

  if (args.length > 0) {
    const invalid = args.filter((arg) => !isPackage(arg));
    if (invalid.length > 0) {
      log.error(
        `Unknown package(s): ${invalid.join(", ")}. Valid: ${VALID_PACKAGES.join(", ")}`,
      );
      return 1;
    }
    packages = args.filter(isPackage);
  } else {
    try {
      const mergeBase = resolveMergeBase(git);
      const files = collectChangedFiles(git, mergeBase.sha);
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
    } catch (error) {
      log.error(error instanceof Error ? error.message : String(error));
      return 1;
    }
  }

  const playwrightSelected = packages.includes("web");
  const plan = planVerify({
    packages,
    playwrightChromiumAvailable: playwrightSelected
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
  const skips = [...plan.skips];
  const executed: string[] = [];
  for (const check of plan.checks) {
    log.log(`\n→ ${check.id}`);
    const inheritIo = !isPlaywrightCheck(check.id);
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
        skips.push({ id: check.id, reason: CHROMIUM_MISSING_REASON });
        log.log(`Skipping ${check.id}: ${CHROMIUM_MISSING_REASON}`);
        continue;
      }
      failed.push(check.id);
      continue;
    }
    executed.push(check.id);
  }

  const ciParityComplete = skips.length === 0;

  log.log("\nSummary");
  log.log(
    `Selected packages: ${plan.packages.length > 0 ? plan.packages.join(", ") : "(none)"}`,
  );
  log.log(`Checks run: ${executed.join(", ") || "(none)"}`);
  if (skips.length > 0) {
    log.log(
      `Checks skipped: ${skips.map((skip) => `${skip.id} (${skip.reason})`).join("; ")}`,
    );
  } else {
    log.log("Checks skipped: (none)");
  }

  if (failed.length > 0) {
    log.error(`\nFailed: ${failed.join(", ")}`);
    return 1;
  }

  if (!ciParityComplete) {
    log.log(
      `\n✓ selected checks passed; CI parity incomplete: ${unique(
        skips.map((skip) => skip.reason),
      ).join("; ")}`,
    );
    return 0;
  }

  log.log("\n✓ All checks passed");
  return 0;
}

function splitLines(output: string): string[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function spawnEnvFor(checkId: string): Record<string, string | undefined> {
  const timezone = process.env["TZ"] ?? "Etc/UTC";
  if (isPlaywrightCheck(checkId)) return playwrightEnv(timezone);
  if (checkId.startsWith("test:")) {
    return { ...process.env, NODE_ENV: "test", TZ: timezone };
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
  if (!isPlaywrightCheck(checkId)) return false;
  const output = combinedSpawnOutput(result).toLowerCase();
  return (
    output.includes("executable doesn't exist") ||
    output.includes("browserType.launch") ||
    output.includes("playwright chromium") ||
    (output.includes("chromium") && output.includes("install"))
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
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
