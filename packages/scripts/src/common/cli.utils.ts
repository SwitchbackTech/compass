import pkg from "inquirer";
const { prompt } = pkg;
import shell from "shelljs";

import {
  ALL_PACKAGES,
  ARTIFACT_NAME_NODE,
  COMPASS_ROOT_PROD,
  HOME_TY,
} from "./cli.constants";
import { Category_VM, VmInfo } from "./cli.types";

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

export const getVmInfo = async (environment?: Category_VM): Promise<VmInfo> => {
  const destination = environment
    ? environment
    : ((await getListAnswer("Select VM to use:", [
        "staging",
        "production",
      ])) as Category_VM);

  const stagingDomain = "***REMOVED***";
  const productionDomain = "app.compasscalendar.com";

  const stagingUrl = `https://${stagingDomain}/api`;
  const productionUrl = `https://${productionDomain}/api`;

  const isStaging = destination === "staging";

  const baseUrl = isStaging ? stagingUrl : productionUrl;
  const domain = isStaging ? stagingDomain : productionDomain;
  return { baseUrl, destination, domain };
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

export const getPckgsTo = async (verb: "build" | "scp") => {
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
