type CliEnv = {
  FRONTEND_URL: string;
  DEV_BROWSER: string | undefined;
};

export const ALL_PACKAGES = ["nodePckgs", "web"];

export const COMPASS_ROOT_DEV = process.cwd();
export const COMPASS_BUILD_DEV = `${COMPASS_ROOT_DEV}/build`;
export const NODE_BUILD = `${COMPASS_BUILD_DEV}/node`;

export const PCKG = {
  NODE: "nodePckgs",
  WEB: "web",
};

export const ENVIRONMENT = {
  LOCAL: "local",
  STAG: "staging",
  PROD: "production",
};

export const CLI_ENV: CliEnv = {
  FRONTEND_URL: process.env["FRONTEND_URL"] || `http://localhost:9080`,
  DEV_BROWSER: process.env["DEV_BROWSER"],
};
