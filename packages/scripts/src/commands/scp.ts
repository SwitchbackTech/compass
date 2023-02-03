import { VmInfo } from "@scripts/common/cli.types";
import shell from "shelljs";

import {
  COMPASS_BUILD_DEV,
  COMPASS_ROOT_DEV,
  PROJECT_PRODUCTION,
  PROJECT_STAGING,
  SSH_TY_PROD,
  SSH_TY_STAGING,
} from "../common/cli.constants";

export const copyToVM = (packages: string[], vmInfo: VmInfo) => {
  const { destination, domain } = vmInfo;
  const isStaging = destination === "staging";
  const vmPath = isStaging ? SSH_TY_STAGING : SSH_TY_PROD;
  const project = isStaging ? PROJECT_STAGING : PROJECT_PRODUCTION;

  shell.exec(`gcloud config set project ${project}`);

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
    `gcloud compute scp ${COMPASS_ROOT_DEV}/packages/scripts/src/prod/local/* ${vmPath}`
  );

  console.log("Done copying artifact(s) to VM");
  process.exit(0);
};
