import pkg from "inquirer";
import chalk from "chalk";
const { prompt } = pkg;
import shell from "shelljs";

import { ALL_PACKAGES, CLI_ENV } from "./cli.constants";
import { Category_VM } from "./cli.types";

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

export const getVmInfo = async (environment?: Category_VM) => {
  const destination = environment
    ? environment
    : ((await getListAnswer("Select environment to use:", [
        "staging",
        "production",
      ])) as Category_VM);

  const isStaging = destination === "staging";
  const domain = await getDomainAnswer(isStaging);
  const baseUrl = `https://${domain}/api`;

  return { baseUrl, destination };
};

const getDomainAnswer = async (isStaging: boolean) => {
  if (isStaging && CLI_ENV.STAGING_DOMAIN !== undefined) {
    return CLI_ENV.STAGING_DOMAIN;
  }

  if (!isStaging && CLI_ENV.PROD_DOMAIN !== undefined) {
    return CLI_ENV.PROD_DOMAIN;
  }

  const q = `Enter the domain of the VM that will be used.
    Do not include 'https://', just the domain.
    Example: app.yourdomain.com

    Type here:`;

  return prompt([{ type: "input", name: "answer", message: q }])
    .then((a: { answer: string }) => {
      console.log(`\tUsing: ${a.answer}.
        Save this value in .env to skip this step next time`);
      return a.answer;
    })
    .catch((e) => {
      console.log(e);
      process.exit(1);
    });
};

const getListAnswer = async (question: string, choices: string[]) => {
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

export const getPckgsTo = async (action: "build") => {
  const q = [
    {
      type: "checkbox",
      name: "packages",
      message: `What package(s) do you want to ${action}?`,
      choices: ALL_PACKAGES,
    },
  ];

  return prompt(q)
    .then((a: { packages: string[] }) => {
      if (a.packages.length > 1) {
        log.error(`Sorry, you can only ${action} one package at a time`);
        process.exit(1);
      }

      return a.packages;
    })
    .catch((e) => {
      console.log(e);
      process.exit(1);
    });
};

export const log = {
  info: (msg: string) => console.log(chalk.italic.whiteBright(msg)),
  error: (msg: string) => console.log(chalk.bold.red(msg)),
  warning: (msg: string) => console.log(chalk.hex("#FFA500")(msg)),
  success: (msg: string) => console.log(chalk.green(msg)),
  tip: (msg: string) => console.log(chalk.hex("#f5c150")(msg)),
};
