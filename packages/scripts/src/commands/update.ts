import shell from "shelljs";

import { COMPASS_ROOT } from "../common/cli.constants";
import { getPckgsTo } from "../common/cli.utils";

const artifactName = "nodePckgs";

// requires root priviledges, so 'sudo su' before running
const updateBackendCore = () => {
  console.log("updating backend+core");

  console.log("removing old backend service");
  shell.exec("pm2 stop backend");
  shell.exec("pm2 delete backend");

  console.log("cleaning old builds");
  shell.rm("-rf", `${COMPASS_ROOT}/build/backend`);
  shell.rm("-rf", `${COMPASS_ROOT}/build/core`);

  console.log("copying new builds...");
  shell.exec(`mkdir -p ${COMPASS_ROOT}/build/backend`);
  shell.exec(
    `unzip -n -d ${COMPASS_ROOT} /home/***REMOVED***/${artifactName}.zip`
  );

  shell.rm(`/home/***REMOVED***/${artifactName}.zip`);

  console.log("starting backend ....");
  shell.cd(COMPASS_ROOT);
  shell.exec(
    "pm2 start /compass-calendar/build/backend/src/app.js --name backend --update-env"
  );
  shell.exec("pm2 save");

  console.log("done updating backend");
};

export const updatePckgs = async () => {
  const pckgs = await getPckgsTo("update");
  if (pckgs.includes("nodePckgs")) {
    updateBackendCore();
  }
  if (pckgs.includes("web")) {
    updateWeb();
  }
};

const updateWeb = () => {
  console.log("backing up old web build ...");
  shell.rm("-rf", `${COMPASS_ROOT}/build/web.bak`);
  // create new
  shell.mv(`${COMPASS_ROOT}/build/web`, `${COMPASS_ROOT}/build/web.bak`);

  console.log("deploying new web build ...");
  shell.mkdir("-p", `${COMPASS_ROOT}/build/web`);
  shell.exec(`unzip -n -d ${COMPASS_ROOT} /home/***REMOVED***/web.zip`);

  // already have a backup now, so delete this one
  shell.rm("/home/***REMOVED***/web.zip");

  console.log("restarting nginx ...");
  shell.exec("systemctl restart nginx");

  console.log("done updating web");
};
