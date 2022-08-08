import pkg from "inquirer";

import { allPckgs } from "./cli.constants";
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
    .then((a: { confirm: boolean }) => a)
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
      choices: allPckgs,
    },
  ];
  return prompt(q)
    .then((a: { packages: string[] }) => a.packages)
    .catch((e) => {
      console.log(e);
      process.exit(1);
    });
};
