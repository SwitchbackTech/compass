import pkg from "inquirer";
import shell from "shelljs";

import {
  ALL_PACKAGES,
  ARTIFACT_NAME_NODE,
  COMPASS_ROOT_PROD,
  HOME_TY,
} from "./cli.constants";
import { Category_VM } from "./cli.types";
const { prompt } = pkg;

export const _confirm = async (question: string, _default = true) => {
  const q = [
    {
      type: "confirm",
      name: "confirm",
      message: question,
      default: _default,
    },
  ];
  return prompt(q)
    .then((a: { confirm: boolean }) => a.confirm)
    .catch((e) => {
      console.log(e);
      process.exit(1);
    });
};

export const fileExists = (file: string) => {
  return shell.test("-e", file);
};

export const getVmInfo = async (): Promise<{
  baseUrl: string;
  destination: Category_VM;
}> => {
  const destination = (await getListAnswer("Select VM to use:", [
    "staging",
    "production",
  ])) as Category_VM;

  const stagingUrl = "https://***REMOVED***/api";
  const productionUrl = "https://app.compasscalendar.com/api";

  const baseUrl = destination === "staging" ? stagingUrl : productionUrl;
  return { baseUrl, destination };
};

export const getListAnswer = async (question: string, choices: string[]) => {
  const q = [
    {
      type: "list",
      name: "answer",
      message: question,
      choices,
    },
  ];
  return prompt(q)
    .then((a: { answer: string }) => a.answer)
    .catch((e) => {
      console.log(e);
      process.exit(1);
    });
};

export const getPckgsTo = async (verb: "build" | "update") => {
  const q = [
    {
      type: "checkbox",
      name: "packages",
      message: `What package(s) do you want to ${verb}?`,
      choices: ALL_PACKAGES,
    },
  ];
  return prompt(q)
    .then((a: { packages: string[] }) => a.packages)
    .catch((e) => {
      console.log(e);
      process.exit(1);
    });
};

export const prepBackend = () => {
  console.log("extracting node artifact ...");

  shell.exec(
    `unzip -o -d ${COMPASS_ROOT_PROD} ${HOME_TY}/${ARTIFACT_NAME_NODE}.zip`
  );

  shell.rm(`${HOME_TY}/${ARTIFACT_NAME_NODE}.zip`);
};

export const startBackend = () => {
  console.log("starting backend ....");
  shell.exec(
    `pm2 start ${COMPASS_ROOT_PROD}/build/node/packages/backend/src/app.js --name prod-backend --update-env`
  );
  // save to synchronize
  shell.exec("pm2 save");
};
