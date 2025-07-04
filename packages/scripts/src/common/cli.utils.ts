import chalk from "chalk";
import pkg from "inquirer";
import shell from "shelljs";
import { ALL_PACKAGES, CLI_ENV } from "./cli.constants";
import { Environment_Cli } from "./cli.types";

const { prompt } = pkg;

export const fileExists = (file: string) => {
  return shell.test("-e", file);
};

export const getApiBaseUrl = async (environment: Environment_Cli) => {
  const category = environment ? environment : await getEnvironmentAnswer();
  const domain = await getDomainAnswer(category);
  const baseUrl =
    environment === "local" ? `http://${domain}/api` : `https://${domain}/api`;

  return baseUrl;
};

export const getClientId = async (environment: Environment_Cli) => {
  if (environment === "staging") {
    return process.env["CLIENT_ID"] as string;
  }

  if (environment === "production") {
    const q = `Enter the googleClientId for the production environment:`;

    return prompt([{ type: "input", name: "answer", message: q }])
      .then((a: { answer: string }) => {
        log.info(`\tUsing: >>${a.answer}<<`);
        return a.answer;
      })
      .catch((e) => {
        console.log(e);
        process.exit(1);
      });
  }

  throw Error("Invalid destination");
};

const getDomainAnswer = async (env: string) => {
  const isLocal = env === "local";
  const isStaging = env === "staging";

  if (isLocal && CLI_ENV.LOCAL_DOMAIN !== undefined) {
    return CLI_ENV.LOCAL_DOMAIN;
  }

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
      log.info(`\tUsing: ${a.answer}.
        Save this value in .env to skip this step next time`);
      return a.answer;
    })
    .catch((e) => {
      console.log(e);
      process.exit(1);
    });
};

export const getEnvironmentAnswer = async (): Promise<Environment_Cli> => {
  const environment = (await getListAnswer("Select environment to use:", [
    "staging",
    "production",
  ])) as Environment_Cli;

  return environment;
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
