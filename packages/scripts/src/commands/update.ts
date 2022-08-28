import shell from "shelljs";

import {
  HOME_TY,
  COMPASS_ROOT,
  COMPASS_BUILD_BACKEND,
} from "../common/cli.constants";
import { getPckgsTo, prepBackend, startBackend } from "../common/cli.utils";

const updateBackendCore = () => {
  console.log("updating backend+core");

  console.log("removing old backend service");
  shell.exec("pm2 stop backend");
  shell.exec("pm2 delete backend");

  console.log("cleaning old builds");
  shell.rm("-rf", `${COMPASS_ROOT}/build/backend`);
  shell.rm("-rf", `${COMPASS_ROOT}/build/core`);

  console.log("copying new builds...");
  shell.exec(`mkdir -p ${COMPASS_BUILD_BACKEND}`);

  prepBackend();
  startBackend();

  console.log("done updating backend+core");
};

export const updatePckgs = async () => {
  console.log("updating node dependencies ...");
  shell.cd(COMPASS_ROOT);
  shell.exec("npm install --production");

  const pckgs = await getPckgsTo("update");
  if (pckgs.includes("nodePckgs")) {
    updateBackendCore();
  }
  if (pckgs.includes("web")) {
    updateWeb();
  }
};

export const updateWeb = () => {
  // console.log("backing up old web build ...");
  // shell.rm("-rf", `${COMPASS_ROOT}/build/web.bak`);
  // create new
  // shell.mv(`${COMPASS_ROOT}/build/web`, `${COMPASS_ROOT}/build/web.bak`);

  console.log("deploying web build ...");
  shell.mkdir("-p", `${COMPASS_ROOT}/build/web`);
  shell.exec(`unzip -n -d ${COMPASS_ROOT} ${HOME_TY}/web.zip`);

  // already have a backup now, so delete this one
  console.log("deleting build from /home/ty_ ...");
  shell.rm(`${HOME_TY}/web.zip`);

  console.log("restarting nginx ...");
  shell.exec("systemctl restart nginx");

  console.log("done updating web");
};
