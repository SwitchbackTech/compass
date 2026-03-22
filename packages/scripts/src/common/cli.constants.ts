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

export const CLI_ENV = {
  LOCAL_WEB_URL: process.env["LOCAL_WEB_URL"] || `http://localhost:9080`,
  STAGING_WEB_URL: process.env["STAGING_WEB_URL"],
  PROD_WEB_URL: process.env["PROD_WEB_URL"],
  DEV_BROWSER: process.env["DEV_BROWSER"],
};
