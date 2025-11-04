import shell from "shelljs";
import { COMPASS_ROOT_DEV, PCKG } from "@scripts/common/cli.constants";
import { Options_Cli } from "@scripts/common/cli.types";
import { getEnvironmentAnswer, log } from "@scripts/common/cli.utils";
import {
  copyNodeConfigsToBuild,
  createNodeDirs,
  installDependencies,
  removeOldBuildFor,
} from "./build.util";

export const runBuild = async (options: Options_Cli) => {
  const packages = options.packages as string[];
  if (!options.environment) {
    options.environment = await getEnvironmentAnswer();
  }

  if (packages.includes(PCKG.NODE)) {
    await buildNodePckgs(options);
  }
  if (packages.includes(PCKG.WEB)) {
    await buildWeb(options);
  }
};

const buildNodePckgs = async (options: Options_Cli) => {
  removeOldBuildFor(PCKG.NODE);
  createNodeDirs();
  await copyNodeConfigsToBuild(options);

  log.info("Compiling node packages ...");
  shell.exec(
    "yarn tsc --project tsconfig.build.json",

    async function (code: number) {
      if (code !== 0) {
        log.error("Exiting because of compilation errors");
        process.exit(code);
      }

      log.success("Compiled node pckgs");

      installDependencies();
    },
  );
};

const buildWeb = async (options: Options_Cli) => {
  removeOldBuildFor(PCKG.WEB);

  const environment = options.environment as string;

  log.info("Compiling web files...");
  shell.cd(`${COMPASS_ROOT_DEV}/packages/web`);
  shell.exec(`webpack --mode=production --node-env=${environment}`);

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
