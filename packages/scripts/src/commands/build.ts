import shell from "shelljs";

import {
  COMPASS_ROOT_DEV,
  PATH_UPDATE_SCRIPT,
  SSH_TY_STAGING,
} from "../common/cli.constants";
import { getApiBaseUrl, getPckgsTo, _confirm } from "../common/cli.utils";

// old way of building project-specific packages
// "tsc:backend": "rm -rf packages/backend/build && yarn tsc --project packages/backend/tsconfig.json",
// "tsc:core": "rm -rf packages/core/build && yarn tsc --project packages/core/tsconfig.json",

const buildPackages = async (pckgs: string[]) => {
  if (pckgs.length === 0) {
    console.log("ya gotta select a package to build");
    process.exit(1);
  }

  if (pckgs.includes("nodePckgs")) {
    buildNodePckgs();
  }

  if (pckgs.includes("web")) {
    await buildWeb();
    await copyToProd(pckgs);
  }
};

const buildNodePckgs = () => {
  console.log("Compiling node packages ...");
  shell.rm("-rf", "build");
  shell.rm("tsconfig.tsbuildinfo");

  shell.exec("yarn tsc --project tsconfig.json", async function (code) {
    if (code !== 0) {
      const ignoreErrors = await _confirm(
        "Compilation errors. Continue anyway? (default: no)",
        false
      );
      if (!ignoreErrors) process.exit(code);
    }

    console.log("copying .env to backend ...");
    shell.cp(
      `${COMPASS_ROOT_DEV}/packages/backend/.env`,
      `${COMPASS_ROOT_DEV}/build/backend`
    );

    zip("nodePckgs");
    await copyToProd(["nodePckgs"]);
  });
};

const buildWeb = async () => {
  shell.cd(`${COMPASS_ROOT_DEV}/packages/web`);

  const { baseUrl, destination } = await getApiBaseUrl();
  const gClientIdTest =
    "***REMOVED***";
  const gClientIdProd =
    "***REMOVED***";

  const gClientId = destination === "staging" ? gClientIdTest : gClientIdProd;

  console.log("Building web ...");
  shell.exec(
    `webpack --mode=production --env API_BASEURL=${baseUrl} API_BASEURL_SYNC=${baseUrl} GOOGLE_CLIENT_ID=${gClientId}`
  );

  shell.cd(COMPASS_ROOT_DEV);
  zip("web");
};

const copyToProd = async (packages: string[]) => {
  const confirmed = await _confirm("Copy artifact to VM? (default y)");

  if (!confirmed) {
    console.log("OK, not copying to VM");
    return;
  }

  shell.cd(COMPASS_ROOT_DEV);

  if (packages.includes("nodePckgs")) {
    console.log(`copying backend+core to VM...`);
    shell.exec(`gcloud compute scp build/nodePckgs.zip ${SSH_TY_STAGING}`);

    console.log("copying scripts to VM...");
    shell.exec(
      `gcloud compute scp build/scripts.zip ${PATH_UPDATE_SCRIPT} ${SSH_TY_STAGING}`
    );
  }

  if (packages.includes("web")) {
    console.log("copying web to prod...");
    shell.exec(`gcloud compute scp build/web.zip ${SSH_TY_STAGING}`);
  }
};

export const runBuild = async () => {
  const pckgs = await getPckgsTo("build");
  await buildPackages(pckgs);
};

const zip = (pckg: "nodePckgs" | "web") => {
  if (pckg === "nodePckgs") {
    shell.exec("zip -r build/nodePckgs.zip build/backend build/core");
    shell.exec("zip -r build/scripts.zip build/scripts");
  } else if (pckg === "web") {
    shell.exec("zip -r build/web.zip build/web");
  }
};
