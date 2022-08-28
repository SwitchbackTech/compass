import shell from "shelljs";

import { HOME_TY } from "../common/cli.constants";
import {
  fileExists,
  getListAnswer,
  prepBackend,
  startBackend,
} from "../common/cli.utils";
import { updateWeb } from "./update";

const initBackend = async () => {
  console.log("checking if backend files exist ...");
  const nodeArtifactExists = fileExists(`${HOME_TY}/nodePckgs.zip`);
  const pckJsonExists = fileExists(`${HOME_TY}/package.json`);
  if (!pckJsonExists || !nodeArtifactExists) {
    console.log(`package.json / artifact is not in expected location`);
    return;
  }

  console.log("installing pm2 ...");
  //https://pm2.keymetrics.io/docs/usage/quick-start/
  shell.exec("npm install pm2@latest -g");

  console.log("enabling pm2 log rotation ...");
  shell.exec("pm2 install pm2-logrotate");

  console.log("setting pm2 to run on boot ...");
  shell.exec("pm2 startup");

  const vmEnv = await getListAnswer("What type of VM is this?", [
    "staging",
    "production",
  ]);
  const nodeEnv = vmEnv === "production" ? "production" : "development";
  console.log(`Setting up backend service for ${nodeEnv}....`);

  const setNodeEnv = `export NODE_ENV=${nodeEnv}`;
  shell.exec(setNodeEnv);
  shell.exec("echo using NODE_ENV: $NODE_ENV ...");

  prepBackend();
  startBackend();

  // confirm it's working
  // - logs also saved in /root/.pm2/logs
  shell.exec("pm2 logs");
};

export const initWeb = () => {
  console.log("initing web ...");
  const buildPath = `${HOME_TY}/web.zip`;

  const buildExists = shell.test("-e", buildPath);
  if (!buildExists) {
    console.log(`web build is not in expected location: ${buildPath}`);
    return;
  }

  updateWeb();
  console.log("done initing web");
};

export const runInit = async () => {
  shell.cd(HOME_TY);

  const serviceToInit = await getListAnswer(
    "What service do you want to init?",
    ["backend", "web"]
  );
  if (serviceToInit === "backend") {
    await initBackend();
  } else if (serviceToInit === "web") {
    initWeb();
  }
};
