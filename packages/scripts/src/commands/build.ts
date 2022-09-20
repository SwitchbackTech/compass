import { VmInfo } from "@scripts/common/cli.types";
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

const buildPackages = async (pckgs: string[], vmInfo: VmInfo) => {
  if (pckgs.length === 0) {
    console.log("ya gotta select a package to build");
    process.exit(1);
  }

  if (pckgs.includes("nodePckgs")) {
    await buildNodePckgs(vmInfo);
  }

  if (pckgs.includes("web")) {
    buildWeb(vmInfo);
    await copyToVM(pckgs, vmInfo);
  }
};

// eslint-disable-next-line @typescript-eslint/require-await
const buildNodePckgs = async (vmInfo: VmInfo) => {
  removeOldBuildFor("nodePckgs");

  console.log("Compiling node packages ...");
  shell.exec("yarn tsc --project tsconfig.json", async function (code: number) {
    if (code !== 0) {
      console.log("Exiting because of compilation errors");
      process.exit(code);
      // _confirm(
      //   "Compilation errors. Use old build and continue anyway? (default: no)",
      //   false
      // )
      //   .then((ignoreErrors) => {
      //     if (!ignoreErrors) process.exit(code);
      //   })
      //   .catch(() => process.exit());
    }

    console.log("Compiled node pckgs");

    copyConfigFilesToBuild(vmInfo);

    installProdDependencies(vmInfo);
  });
};

const buildWeb = (vmInfo: VmInfo) => {
  removeOldBuildFor("web");
  shell.cd(`${COMPASS_ROOT_DEV}/packages/web`);
  console.log("Getting API baseUrl ...");
  const { baseUrl, destination } = vmInfo;

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
};

const copyToVM = async (packages: string[], vmInfo: VmInfo) => {
  const confirmed = await _confirm("Copy artifact(s) to VM? (default y)");

  if (!confirmed) {
    console.log("OK, not copying to VM");
    return;
  }

  const { destination, domain } = vmInfo;
  const vmPath = destination === "staging" ? SSH_TY_STAGING : SSH_TY_PROD;

  if (packages.includes("nodePckgs")) {
    console.log(`copying node artifact to ${destination} (${domain}) ...`);
    shell.exec(
      `gcloud compute scp ${COMPASS_BUILD_DEV}/nodePckgs.zip ${vmPath}`
    );
  }

  if (packages.includes("web")) {
    console.log(`copying web artifact to ${destination} (${domain}) ...`);
    shell.exec(`gcloud compute scp ${COMPASS_BUILD_DEV}/web.zip ${vmPath}`);
  }

  console.log("copying latest bash scripts to VM ...");
  shell.exec(
    `gcloud compute scp ${COMPASS_ROOT_DEV}/packages/scripts/src/prod/* ${vmPath}`
  );

  console.log("Done copying artifact(s) to VM");
  process.exit(0);
};

const copyConfigFilesToBuild = (vmInfo: VmInfo) => {
  const NODE_BUILD = `${COMPASS_BUILD_DEV}/node`;

  const envName = vmInfo.destination === "production" ? ".prod.env" : ".env";

  console.log("copying root configs to build ...");
  shell.cp(
    `${COMPASS_ROOT_DEV}/packages/backend/${envName}`,
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
};

const installProdDependencies = async (vmInfo: VmInfo) => {
  console.log("installing prod dependencies for node pckgs ...");

  shell.cd(`${COMPASS_BUILD_DEV}/node`);
  shell.exec("yarn install --production", async function (code: number) {
    if (code !== 0) {
      console.log("exiting cuz error during compiliation");
      process.exit(code);
    }

    zipNode();

    await copyToVM(["nodePckgs"], vmInfo);
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
  const vmInfo = await getVmInfo();
  await buildPackages(pckgs, vmInfo);
};

const zipNode = () => {
  shell.cd(COMPASS_ROOT_DEV);
  shell.exec(`zip -q -r build/nodePckgs.zip build/node`);
};

const zipWeb = () => {
  shell.cd(COMPASS_ROOT_DEV);
  shell.exec(`zip -r build/web.zip build/web`);
};
