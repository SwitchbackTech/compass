import pkg from "inquirer";
import chalk from "chalk";
const { prompt } = pkg;
import shell from "shelljs";
import { Command } from "commander";

import { ALL_PACKAGES, CLI_ENV } from "./cli.constants";
import { Environment_Cli, Options_Cli, Schema_Options_Cli } from "./cli.types";

export const fileExists = (file: string) => {
  return shell.test("-e", file);
};

export const getApiBaseUrl = async (environment: Environment_Cli) => {
  const category = environment ? environment : await getEnvironmentAnswer();
  const isStaging = category === "staging";
  const domain = await getDomainAnswer(isStaging);
  const baseUrl = `https://${domain}/api`;

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

export const mergeOptions = (program: Command): Options_Cli => {
  const _options = program.opts();
  const packages = program.args[1]?.split(",");
  const options: Options_Cli = {
    ..._options,
    force: _options["force"] === true,
    packages,
  };

  const build = program.commands.find((cmd) => cmd.name() === "build");
  const clientId = build?.opts()["clientId"] as string;
  if (build && clientId) {
    options.clientId = clientId;
  }

  return options;
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

export const validateOptions = (options: Options_Cli): Options_Cli => {
  const { data, error } = Schema_Options_Cli.safeParse(options);
  if (error) {
    log.error(`Invalid CLI options: ${JSON.stringify(error.format())}`);
    process.exit(1);
  }

  return data;
};

export const validatePackages = (packages: string[] | undefined) => {
  if (!packages) {
    log.error("Packages must be defined");
    process.exit(1);
  }
  const unsupportedPackages = packages.filter(
    (pkg) => !ALL_PACKAGES.includes(pkg)
  );
  if (unsupportedPackages.length > 0) {
    log.error(
      `One or more of these packages isn't supported: ${unsupportedPackages.toString()}`
    );
    process.exit(1);
  }
};
