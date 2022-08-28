import shell from "shelljs";

import { HOME_TY, COMPASS_ROOT_PROD } from "../common/cli.constants";
import { getPckgsTo, prepBackend, startBackend } from "../common/cli.utils";

const updateBackendCore = () => {
  console.log("updating backend+core");

  console.log("removing old backend service");
  shell.exec("pm2 stop backend");
  shell.exec("pm2 delete backend");

  console.log("cleaning old builds");
  shell.rm("-rf", `${COMPASS_ROOT_PROD}/build/backend`);
  shell.rm("-rf", `${COMPASS_ROOT_PROD}/build/core`);

  console.log("copying new builds...");
  shell.exec(`mkdir -p ${COMPASS_ROOT_PROD}`);

  prepBackend();
  startBackend();

  console.log("done updating backend+core");
};

export const updatePckgs = async () => {
  console.log("updating node dependencies ...");
  shell.cd(COMPASS_ROOT_PROD);
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
  console.log("deleting old web build ...");
  shell.rm("-rf", `${COMPASS_ROOT_PROD}/build/web`);

  console.log("extracting web build ...");
  // shell.mkdir("-p", `${COMPASS_ROOT_PROD}/build/web`);
  shell.exec(`unzip -o -d ${COMPASS_ROOT_PROD} ${HOME_TY}/web.zip`);

  // already have a backup now, so delete this one
  console.log("deleting build from /home/ty_ ...");
  shell.rm(`${HOME_TY}/web.zip`);

  console.log("restarting nginx ...");
  shell.exec("systemctl restart nginx");

  console.log("done updating web");
};
