/**
 * Runs `bun test --parallel` with a package preload and no shared mongod.
 * Used for core and mongo-free `:fast` tiers.
 *
 * Usage:
 *   bun test-parallel.ts <profile> -- [bun test flags/paths...]
 */

import { backendTestSpawnEnv } from "./backend-test-env";
import {
  formatDuration,
  parseExtraArgs,
  resolveTestTargets,
  warnIfBunVersionMismatch,
} from "./runner-utils";
import { resolve } from "node:path";

export type ProfileName =
  | "core"
  | "web"
  | "backend-fast"
  | "sync-fast"
  | "scripts-fast";

/** Synthetic URI for :fast tiers — env contract only, no mongod connection. */
const FAST_MONGO_URI = "mongodb://127.0.0.1:27017/unused-compass-test";

const PROFILES: Record<
  ProfileName,
  { preload: string; scan: string; label: string }
> = {
  core: {
    preload: "packages/scripts/src/testing/core.preload.ts",
    scan: "./packages/core/src",
    label: "core",
  },
  web: {
    preload: "packages/web/src/__tests__/web.preload.ts",
    scan: "./packages/web/src",
    label: "web",
  },
  "backend-fast": {
    preload: "packages/backend/src/__tests__/backend.preload.fast.ts",
    scan: "./packages/backend/src",
    label: "backend (fast)",
  },
  "sync-fast": {
    preload: "packages/sync/src/__tests__/sync.preload.fast.ts",
    scan: "./packages/sync/src",
    label: "sync (fast)",
  },
  "scripts-fast": {
    preload: "packages/scripts/src/testing/scripts.preload.fast.ts",
    scan: "./packages/scripts/src",
    label: "scripts (fast)",
  },
};

// Web uses jsdom + MSW XHR patching + module singletons that Bun's parallel
// `--isolate` clears between files (MSW's oldXMLHttpRequest becomes undefined).
// Sequential files in one process is still far faster than the old per-file
// launcher. The full web suite then runs as a few sequential processes so
// jsdom/MSW RSS is released between shards — a single 3k-test process has
// been SIGKILL'd (exit 137) on 7 GB GitHub runners.
export function parallelArgsFor(profile: ProfileName): string[] {
  return profile === "web" ? [] : ["--parallel"];
}

export function shardTargets(
  targets: string[],
  shardCount: number,
): string[][] {
  if (targets.length === 0 || shardCount <= 1) {
    return [targets];
  }
  const count = Math.min(Math.floor(shardCount), targets.length);
  const size = Math.ceil(targets.length / count);
  const shards: string[][] = [];
  for (let i = 0; i < targets.length; i += size) {
    shards.push(targets.slice(i, i + size));
  }
  return shards;
}

export function webSuiteShardCount(opts: {
  explicitPathCount: number;
  envShards?: string;
}): number {
  if (opts.explicitPathCount > 0) {
    return 1;
  }
  const raw = opts.envShards;
  if (raw === undefined || raw === "") {
    return 2;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 2;
  }
  return Math.floor(parsed);
}

export function testArgvFor(
  profile: ProfileName,
  opts: {
    preloadPath: string;
    bunFlags: string[];
    targets: string[];
  },
): string[] {
  const needsHookTimeout =
    profile === "backend-fast" ||
    profile === "sync-fast" ||
    profile === "scripts-fast";

  return [
    "bun",
    "test",
    ...parallelArgsFor(profile),
    ...(needsHookTimeout ? ["--timeout", "60000"] : []),
    "--preload",
    opts.preloadPath,
    ...opts.bunFlags,
    ...opts.targets,
  ];
}

async function runCli(): Promise<void> {
  warnIfBunVersionMismatch("1.3.14");

  const profile = process.argv[2] as ProfileName;
  const separatorIndex = process.argv.indexOf("--");
  const extraArgs =
    separatorIndex === -1
      ? process.argv.slice(3)
      : process.argv.slice(separatorIndex + 1);

  if (!profile || !PROFILES[profile]) {
    console.error(
      "Usage: test-parallel.ts <core|web|backend-fast|sync-fast|scripts-fast> -- [bun test flags/paths...]",
    );
    process.exit(2);
  }

  const { preload, scan, label } = PROFILES[profile];
  const preloadPath = resolve(preload);
  const { targets, bunFlags } = resolveTestTargets(scan, extraArgs, {
    expandDirectory: true,
  });
  const { explicitPaths } = parseExtraArgs(extraArgs);
  const shards =
    profile === "web"
      ? shardTargets(
          targets,
          webSuiteShardCount({
            explicitPathCount: explicitPaths.length,
            envShards: process.env.WEB_TEST_SHARDS,
          }),
        )
      : [targets];

  const started = Date.now();
  const spawnEnv =
    profile === "backend-fast" || profile === "scripts-fast"
      ? backendTestSpawnEnv(FAST_MONGO_URI)
      : { ...process.env, TZ: "Etc/UTC", NODE_ENV: "test" };

  for (const [index, shard] of shards.entries()) {
    const shardLabel =
      shards.length > 1
        ? `${label} shard ${index + 1}/${shards.length} (${shard.length} files)`
        : label;
    console.log(`Running ${shardLabel}...`);

    const proc = Bun.spawn(
      testArgvFor(profile, {
        preloadPath,
        bunFlags,
        targets: shard,
      }),
      {
        env: spawnEnv,
        stdout: "inherit",
        stderr: "inherit",
      },
    );
    const code = await proc.exited;
    if (code !== 0) {
      console.log(`\n${shardLabel}: finished in ${formatDuration(started)}s`);
      process.exit(code ?? 1);
    }
  }

  console.log(`\n${label}: finished in ${formatDuration(started)}s`);
}

if (import.meta.main) {
  await runCli();
}
