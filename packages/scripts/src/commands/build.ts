import shell from "shelljs";

import {
  COMPASS_BUILD_DEV,
  COMPASS_ROOT_DEV,
  SSH_TY_PROD,
  SSH_TY_STAGING,
} from "../common/cli.constants";
import { getVmInfo, getPckgsTo, _confirm } from "../common/cli.utils";

// old way of building project-specific packages
// "tsc:backend": "rm -rf packages/backend/build && yarn tsc --project packages/backend/tsconfig.json",
// "tsc:core": "rm -rf packages/core/build && yarn tsc --project packages/core/tsconfig.json",

const buildPackages = async (pckgs: string[]) => {
  if (pckgs.length === 0) {
    console.log("ya gotta select a package to build");
    process.exit(1);
  }

  if (pckgs.includes("nodePckgs")) {
    await buildNodePckgs();
  }

  if (pckgs.includes("web")) {
    const destination = await buildWeb();
    await copyToVM(pckgs, destination);
  }
};

// eslint-disable-next-line @typescript-eslint/require-await
const buildNodePckgs = async () => {
  removeOldBuildFor("nodePckgs");

  console.log("Compiling node packages ...");
  shell.exec("yarn tsc --project tsconfig.json", function (code: number) {
    if (code !== 0) {
      _confirm(
        "Compilation errors. Use old build and continue anyway? (default: no)",
        false
      )
        .then((ignoreErrors) => {
          if (!ignoreErrors) process.exit(code);
        })
        .catch(() => process.exit());
    }

    console.log("Compiled node pckgs");

    copyConfigFilesToBuild();

    installProdDependencies();
  });
};

const buildWeb = async () => {
  removeOldBuildFor("web");
  shell.cd(`${COMPASS_ROOT_DEV}/packages/web`);
  console.log("getting API baseUrl ...");
  const { baseUrl, destination } = await getVmInfo();
  const gClientIdTest =
    "***REMOVED***";
  const gClientIdProd =
    "***REMOVED***";

  const gClientId = destination === "staging" ? gClientIdTest : gClientIdProd;

  console.log("Compiling web files...");
  shell.exec(
    `webpack --mode=production --env API_BASEURL=${baseUrl} API_BASEURL_SYNC=${baseUrl} GOOGLE_CLIENT_ID=${gClientId}`
  );

  shell.cd(COMPASS_ROOT_DEV);
  zipWeb();

  return destination;
};

const copyToVM = async (packages: string[], destination?: string) => {
  const confirmed = await _confirm("Copy artifact(s) to VM? (default y)");

  if (!confirmed) {
    console.log("OK, not copying to VM");
    return;
  }

  if (!destination) {
    const { destination: d } = await getVmInfo();
    destination = d;
  }
  const vmPath = destination === "staging" ? SSH_TY_STAGING : SSH_TY_PROD;

  if (packages.includes("nodePckgs")) {
    console.log(`copying node artifact to ${destination}...`);
    shell.exec(
      `gcloud compute scp ${COMPASS_BUILD_DEV}/nodePckgs.zip ${vmPath}`
    );
  }

  if (packages.includes("web")) {
    console.log(`copying web artifact to ${destination} ...`);
    shell.exec(`gcloud compute scp ${COMPASS_BUILD_DEV}/web.zip ${vmPath}`);
  }

  console.log("Done copying artifact(s) to VM");
};

const copyConfigFilesToBuild = () => {
  // shell.cp(`${COMPASS_ROOT_DEV}/lerna.json`, COMPASS_BUILD_DEV); //++
  const NODE_BUILD = `${COMPASS_BUILD_DEV}/node`;

  console.log("copying root configs to build ...");
  shell.cp(
    `${COMPASS_ROOT_DEV}/packages/backend/.prod.env`,
    `${NODE_BUILD}/.env`
  );

  console.log("copying package configs to build ...");
  shell.cp(`${COMPASS_ROOT_DEV}/package.json`, `${NODE_BUILD}/package.json`);

  shell.cp(
    `${COMPASS_ROOT_DEV}/packages/backend/package.json`,
    `${NODE_BUILD}/packages/backend/package.json`
  );
  shell.cp(
    `${COMPASS_ROOT_DEV}/packages/core/package.json`,
    `${NODE_BUILD}/packages/core/package.json`
  );
  shell.cp(
    `${COMPASS_ROOT_DEV}/packages/scripts/package.json`,
    `${NODE_BUILD}/packages/scripts/package.json`
  );
};

const installProdDependencies = () => {
  console.log("installing prod dependencies for node pckgs ...");

  shell.cd(`${COMPASS_BUILD_DEV}/node`);
  shell.exec("yarn install --production", async function (code: number) {
    if (code !== 0) {
      console.log("exiting cuz error during compiliation");
      process.exit(code);
    }

    zipNode();

    await copyToVM(["nodePckgs"]);
  });
};

const removeOldBuildFor = (pckg: "nodePckgs" | "web") => {
  if (pckg === "nodePckgs") {
    console.log("Removing old node build ...");
    shell.rm("-rf", ["build/node", "build/nodePckgs.zip"]);
  }
  if (pckg === "web") {
    console.log("Removing old web build ...");
    shell.rm("-rf", ["build/web", "build/web.zip"]);
  }
};

export const runBuild = async () => {
  const pckgs = await getPckgsTo("build");
  await buildPackages(pckgs);
};

const zipNode = () => {
  shell.cd(COMPASS_ROOT_DEV);
  shell.exec(`zip -r build/nodePckgs.zip build/node`);
};

const zipWeb = () => {
  shell.cd(COMPASS_ROOT_DEV);
  shell.exec(`zip -r build/web.zip build/web`);
};
