import pkg from "inquirer";

import { ALL_PACKAGES } from "./cli.constants";
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

export const getApiBaseUrl = async () => {
  const destination = await getListAnswer(
    "Where is this build going to be served from? (this will determine the API baseurl)",
    ["staging", "production"]
  );

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
