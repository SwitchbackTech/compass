import { COMPASS_ROOT_DEV, PCKG } from "@scripts/common/cli.constants";
import { type Options_Cli } from "@scripts/common/cli.types";
import { getEnvironmentAnswer, log } from "@scripts/common/cli.utils";
import {
  copyNodeConfigsToBuild,
  createNodeDirs,
  installDependencies,
  removeOldBuildFor,
} from "./build.util";

type BunRuntime = {
  spawnSync(input: {
    cmd: string[];
    cwd?: string;
    env?: Record<string, string | undefined>;
    stderr?: "inherit";
    stdout?: "inherit";
  }): { exitCode: number };
};

const bunRuntime = (globalThis as unknown as { Bun: BunRuntime }).Bun;

export const runBuild = async (options: Options_Cli) => {
  const packages = options.packages as string[];
  if (!options.environment) {
    options.environment = await getEnvironmentAnswer();
  }

  if (packages.includes(PCKG.NODE)) {
    await buildNodePckgs(options);
  }
  if (packages.includes(PCKG.WEB)) {
    buildWeb(options);
  }
};

const buildNodePckgs = async (options: Options_Cli) => {
  removeOldBuildFor(PCKG.NODE);
  createNodeDirs();
  await copyNodeConfigsToBuild(options);

  log.info("Compiling node packages ...");
  const result = bunRuntime.spawnSync({
    cmd: ["bunx", "tsc", "--project", "tsconfig.build.json"],
    cwd: COMPASS_ROOT_DEV,
    stderr: "inherit",
    stdout: "inherit",
  });
  if (result.exitCode !== 0) {
    log.error("Exiting because of compilation errors");
    process.exit(result.exitCode);
  }

  log.success("Compiled node pckgs");
  installDependencies();
};

const buildWeb = (options: Options_Cli) => {
  removeOldBuildFor(PCKG.WEB);

  const environment = options.environment as string;

  log.info("Compiling web files...");
  const result = bunRuntime.spawnSync({
    cmd: [
      "bun",
      "../../node_modules/webpack-cli/bin/cli.js",
      "--mode=production",
      `--node-env=${environment}`,
    ],
    cwd: `${COMPASS_ROOT_DEV}/packages/web`,
    env: {
      ...process.env,
      TZ: process.env["TZ"] ?? "Etc/UTC",
    },
    stderr: "inherit",
    stdout: "inherit",
  });
  if (result.exitCode !== 0) {
    log.error("Webpack compilation failed");
    process.exit(result.exitCode);
  }

  log.success(`Done building web files.`);
  log.tip(`
    Now you'll probably want to:
      - zip the build dir
      - copy it to your ${environment} environment
      - unzip it to expose the static assets
      - serve assets
      `);
  process.exit(0);
};
