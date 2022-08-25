import shell from "shelljs";

import { COMPASS_ROOT } from "../common/cli.constants";
import { _confirm, getListAnswer } from "../common/cli.utils";

export const runInit = async () => {
  const isUserSure = await _confirm(
    "Are you on a VM with pm2 installed? (default Y)"
  );
  if (!isUserSure) {
    console.log("This command is only meant for setting up a VM. Exiting...");
    return;
  }

  const vmEnv = await getListAnswer("What type of VM is this?", [
    "staging",
    "production",
  ]);
  const nodeEnv = vmEnv === "production" ? "production" : "development";
  console.log(`Setting up backend service for ${nodeEnv}....`);

  // enable log rotation
  shell.exec("pm2 install pm2-logrotate");

  shell.cd(`${COMPASS_ROOT}/build/backend/src`);
  shell.exec(`export NODE_ENV=${nodeEnv} && pm2 start app.js --name backend`);

  // save to synchronize
  shell.exec("pm2 save");

  // run it on boot
  shell.exec("pm2 startup");

  // confirm it's working
  // - logs also saved in /root/.pm2/logs
  shell.exec("pm2 logs");
};
