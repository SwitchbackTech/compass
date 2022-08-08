import shell from "shelljs";
import { isEqual } from "lodash";

import { getPckgsTo, _confirm } from "../common/cli.utils";

const allPckgs = ["backend", "core", "scripts", "web"];

const buildPackages = (pckgs: string[]) => {
  if (pckgs.length === 0) {
    console.log("ya gotta select a package to build");
    process.exit(1);
  }

  const buildAll = isEqual(pckgs, allPckgs);
  if (buildAll) {
    console.log("building all pckgs from scratch ...");
    buildWeb();
    buildNodePckgs();
    return;
  }

  if (pckgs.includes("backend")) {
    buildNodePckgs();
  }

  if (pckgs.includes("web")) {
    buildWeb();
  }
};

const buildNodePckgs = () => {
  console.log("building node pckgs ...");
  shell.rm("-rf", "build");
  shell.rm("tsconfig.tsbuildinfo");
  shell.exec("yarn tsc --project tsconfig.json");
  zip("nodePckgs");
};

const buildWeb = () => {
  console.log("building web...");
  shell.cd("packages/web");
  shell.exec("webpack --mode=production --env production");
  shell.cd("../..");
  zip("web");
};

const copyToProd = async (packages: string[]) => {
  const confirmed = await _confirm("Copy artifact to prod? (default Y)");

  if (!confirmed) {
    console.log("OK, not copying to prod");
    return;
  }

  if (packages.includes("backend")) {
    console.log(`copying artifact to prod for: backend ...`);
    shell.exec(
      "gcloud compute scp build/backend.zip ***REMOVED***@compass-backend1:/home/***REMOVED***/ --zone us-central1-a"
    );
  }
  if (packages.includes("web")) {
    console.log("copying web to prod...");
    shell.exec(
      "gcloud compute scp build/web.zip ***REMOVED***@compass-backend1:/home/***REMOVED***/ --zone us-central1-a"
    );
  }
};

export const runBuild = async () => {
  const pckgs = await getPckgsTo("build");
  buildPackages(pckgs);
  await copyToProd(pckgs);
};

const zip = (pckg: "nodePckgs" | "web") => {
  if (pckg === "nodePckgs") {
    shell.exec(
      // "zip -r build/artifact.zip build/backend build/core build/scripts"
      "zip -r build/backend.zip build/backend build/core"
    );
  } else if (pckg === "web") {
    shell.exec("zip -r build/web.zip build/web");
  }
};
