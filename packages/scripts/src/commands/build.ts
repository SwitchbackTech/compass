import shell from "shelljs";

import {
  COMPASS_ROOT_DEV,
  PATH_UPDATE_SCRIPT,
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
    buildNodePckgs();
  }

  if (pckgs.includes("web")) {
    const destination = await buildWeb();
    await copyToVM(pckgs, destination);
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

    console.log("copying .prod.env to backend build ...");
    shell.cp(
      `${COMPASS_ROOT_DEV}/packages/backend/.prod.env`,
      `${COMPASS_ROOT_DEV}/build/backend/.env`
    );

    zip("nodePckgs");
    await copyToVM(["nodePckgs"]);
  });
};

const buildWeb = async () => {
  shell.cd(`${COMPASS_ROOT_DEV}/packages/web`);

  console.log("getting API baseUrl ...");
  const { baseUrl, destination } = await getVmInfo();
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
  return destination;
};

const copyToVM = async (packages: string[], destination?: string) => {
  const confirmed = await _confirm("Copy artifact to VM? (default y)");

  if (!confirmed) {
    console.log("OK, not copying to VM");
    return;
  }

  if (!destination) {
    const { destination: d } = await getVmInfo();
    destination = d;
  }
  const vmPath = destination === "staging" ? SSH_TY_STAGING : SSH_TY_PROD;

  shell.cd(COMPASS_ROOT_DEV);

  console.log(`copying package.json to ${destination} ...`);
  shell.exec(`gcloud compute scp package.json ${vmPath}`);

  if (packages.includes("nodePckgs")) {
    console.log(`copying backend+core to ${destination}...`);
    shell.exec(`gcloud compute scp build/nodePckgs.zip ${vmPath}`);

    console.log(`copying script artifact & bash to ${destination} ...`);
    shell.exec(
      `gcloud compute scp ${COMPASS_ROOT_DEV}/build/scripts.zip ${PATH_UPDATE_SCRIPT} ${vmPath}`
    );
  }

  if (packages.includes("web")) {
    console.log("copying web to prod...");
    shell.exec(`gcloud compute scp build/web.zip ${vmPath}`);
  }

  console.log("Done copying artifact(s) to VM");
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
