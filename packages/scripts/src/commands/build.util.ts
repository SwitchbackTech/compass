import shell from "shelljs";
import {
  COMPASS_BUILD_DEV,
  COMPASS_ROOT_DEV,
  NODE_BUILD,
  PCKG,
} from "@scripts/common/cli.constants";
import { Options_Cli } from "@scripts/common/cli.types";
import { _confirm, fileExists, log } from "@scripts/common/cli.utils";

/**
 * Utilities for building a project
 */

export const copyNodeConfigsToBuild = async (options: Options_Cli) => {
  const envName =
    options.environment === "production"
      ? ".env.production"
      : options.environment === "staging"
        ? ".env.staging"
        : ".env.local";

  const envPath = `${COMPASS_ROOT_DEV}/packages/backend/${envName}`;

  if (fileExists(envPath)) {
    log.info("Copying env file to build ...");

    shell.cp(envPath, `${NODE_BUILD}/.env`);
    log.success("Copied env file to build");
  } else {
    log.warning(`Env file does not exist: ${envPath}`);

    const keepGoing =
      options.force === true ? true : await _confirm("Continue anyway?");

    if (!keepGoing) {
      log.error("Exiting due to missing env file");
      process.exit(1);
    }

    log.warning("Continuing without env file ...");
  }

  log.info("Copying package configs to build ...");
  shell.cp(`${COMPASS_ROOT_DEV}/package.json`, `${NODE_BUILD}/package.json`);

  shell.cp(
    `${COMPASS_ROOT_DEV}/packages/backend/package.json`,
    `${NODE_BUILD}/packages/backend/package.json`,
  );
  shell.cp(
    `${COMPASS_ROOT_DEV}/packages/core/package.json`,
    `${NODE_BUILD}/packages/core/package.json`,
  );
  log.success("Copied package configs to build");
};

export const createNodeDirs = () => {
  shell.mkdir("-p", `${NODE_BUILD}/packages/backend`);
  shell.mkdir("-p", `${NODE_BUILD}/packages/core`);
};

export const installDependencies = () => {
  log.info("Installing dependencies...");

  shell.cd(`${COMPASS_BUILD_DEV}/node`);
  shell.exec(
    "yarn install --production --ignore-scripts",
    function (code: number) {
      if (code !== 0) {
        log.error("Exiting cuz error during compiliation");
        process.exit(code);
      }

      log.success(`Done building node packages.`);
      log.tip(`
    Now you'll probably want to:
      - zip the build/node dir
      - copy it to your prod server
      - unzip it
      - run it`);
      process.exit(0);
    },
  );
};

export const removeOldBuildFor = (pckg: string) => {
  if (pckg === PCKG.NODE) {
    log.info("Removing old node build ...");
    shell.rm("-rf", [
      "build/tsconfig.tsbuildinfo",
      "build/node",
      "build/nodePckgs.zip",
    ]);
    log.success("Removed old node build");
  }

  if (pckg === PCKG.WEB) {
    log.info("Removing old web build ...");
    shell.rm("-rf", ["build/web", "build/web.zip"]);
    log.success("Removed old web build");
  }
};
