import shell from "shelljs";

import { getPckgsTo } from "../common/cli.utils";

// requires root priviledges, so 'sudo su' before running
const updateBackend = () => {
  shell.exec("pm2 stop backend");
  shell.exec("pm2 delete backend");

  // cleanup old build files
  shell.rm("-rf", "/compass-calendar/build/backend");
  shell.rm("-rf", "/compass-calendar/build/core");

  // creates compass-calendar/build/backend and ../build/core
  shell.exec("mkdir -p /compass-calendar/build/backend");
  shell.exec(
    "unzip -n -d /compass-calendar /home/***REMOVED***/backend.zip"
  );
  shell.cp("/compass-calendar/.env", "/compass-calendar/build/backend/");

  // cleanup build artifact
  shell.rm("/home/***REMOVED***/backend.zip");

  // init
  shell.cd("/compass-calendar/");

  // start
  shell.exec("pm2 start yarn --name backend -- start:backend --update-env");
  shell.exec("pm2 save");
};

export const updatePckgs = async () => {
  const pckgs = await getPckgsTo("update");
  if (pckgs.includes("backend")) {
    updateBackend();
  }
  if (pckgs.includes("web")) {
    updateWeb();
  }
};

const updateWeb = () => {
  shell.rm("-rf", "/compass-calendar/build/web.bak"); //remove old
  shell.mv("/compass-calendar/build/web", "/compass-calendar/build/web.bak"); //create new
  shell.mkdir("-p", "/compass-calendar/build/web");

  // creates compass-calendar/build/web
  shell.exec("unzip -n -d /compass-calendar /home/***REMOVED***/web.zip");

  //already have a backup now, so delete this one
  shell.rm("rm /home/***REMOVED***/web.zip");

  shell.exec("systemctl restart nginx");
};
