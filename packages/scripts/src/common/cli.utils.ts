import pkg from "inquirer";
import { type Environment_Cli } from "./cli.types";
import { styleText } from "node:util";
import { CONFIG } from "@backend/common/constants/config.constants";

const { prompt } = pkg;

export const getApiBaseUrl = async (
  environment: Environment_Cli,
): Promise<string> => {
  const category = environment ? environment : await getEnvironmentAnswer();

  if (category === "local") {
    return CONFIG.BASEURL.replace(/\/$/, "");
  }

  const domain = await getDomainAnswer();
  return `https://${domain}/api`;
};

const getDomainAnswer = async () => {
  const { hostname, host } = new URL(CONFIG.FRONTEND_URL);

  if (hostname !== "localhost") {
    return host;
  }

  const q = `Enter the domain of the VM that will be used.
    Do not include 'https://', just the domain.
    Example: app.yourdomain.com

    Tip: set web.url in compass.yaml to skip this step.

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
