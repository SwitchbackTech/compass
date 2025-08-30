import shell from "shelljs";
import { COMPASS_ROOT_DEV, PCKG } from "@scripts/common/cli.constants";
import { Options_Cli } from "@scripts/common/cli.types";
import { _confirm, log } from "@scripts/common/cli.utils";
import {
  copyNodeConfigsToBuild,
  createNodeDirs,
  getBuildOptions,
  installDependencies,
  removeOldBuildFor,
} from "./build.util";

export const runBuild = async (options: Options_Cli) => {
  const packages = options.packages as string[];

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
  const environment = options.environment;
  const { baseUrl, gClientId, posthogKey, posthogHost, stripePublishableKey } =
    await getBuildOptions(options);
  removeOldBuildFor(PCKG.WEB);

  log.info("Compiling web files...");
  shell.cd(`${COMPASS_ROOT_DEV}/packages/web`);
  shell.exec(
    `webpack --mode=production --env API_BASEURL=${baseUrl} GOOGLE_CLIENT_ID=${gClientId} POSTHOG_KEY=${posthogKey} POSTHOG_HOST=${posthogHost} STRIPE_PUBLISHABLE_KEY=${stripePublishableKey}`,
  );

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
