import pkg from "inquirer";
import { existsSync } from "node:fs";
import { styleText } from "node:util";
import { CLI_ENV } from "./cli.constants";
import { type Environment_Cli } from "./cli.types";

const { prompt } = pkg;

export const fileExists = (file: string) => {
  return existsSync(file);
};

export const getApiBaseUrl = async (
  environment: Environment_Cli,
): Promise<string> => {
  const category = environment ? environment : await getEnvironmentAnswer();

  if (category === "local") {
    const baseUrl: string = (
      process.env["BASEURL"] || `http://localhost:3000/api`
    ).replace(/\/$/, "");
    return baseUrl;
  }

  const domain = await getDomainAnswer();
  return `https://${domain}/api`;
};

const getDomainAnswer = async () => {
  const { hostname, host } = new URL(CLI_ENV.FRONTEND_URL);

  if (hostname !== "localhost") {
    return host;
  }

  const q = `Enter the domain of the VM that will be used.
    Do not include 'https://', just the domain.
    Example: app.yourdomain.com

    Tip: set FRONTEND_URL in .env to skip this step.

    Type here:`;

  return prompt([{ type: "input", name: "answer", message: q }])
    .then((a: { answer: string }) => {
      log.info(`\tUsing: ${a.answer}`);
      return a.answer;
    })
    .catch((e) => {
      console.log(e);
      process.exit(1);
    });
};

export const getEnvironmentAnswer = async (): Promise<Environment_Cli> => {
  const environment = (await getListAnswer("Select environment to use:", [
    "local",
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

export const log = {
  info: (msg: string) => console.log(styleText(["italic", "whiteBright"], msg)),
  error: (msg: string) => console.log(styleText(["bold", "red"], msg)),
  warning: (msg: string) => console.log(styleText("yellow", msg)),
  success: (msg: string) => console.log(styleText("green", msg)),
  tip: (msg: string) => console.log(styleText("yellowBright", msg)),
};
