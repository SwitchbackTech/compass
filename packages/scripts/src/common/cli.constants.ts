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
  LOCAL_DOMAIN: process.env["LOCAL_DOMAIN"] || `localhost:3000`,
  LOCAL_WEB_DOMAIN: process.env["LOCAL_WEB_DOMAIN"] || `localhost:9080`,
  STAGING_DOMAIN: process.env["STAGING_DOMAIN"],
  PROD_DOMAIN: process.env["PROD_DOMAIN"],
  DEV_BROWSER: process.env["DEV_BROWSER"],
};
