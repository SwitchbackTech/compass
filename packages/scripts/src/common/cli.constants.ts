export const ALL_PACKAGES = ["nodePckgs", "web"];

export const COMPASS_ROOT_DEV = process.cwd();
export const COMPASS_BUILD_DEV = `${COMPASS_ROOT_DEV}/build`;

export const CLI_ENV = {
  STAGING_DOMAIN: process.env["STAGING_DOMAIN"],
  PROD_DOMAIN: process.env["PROD_DOMAIN"],
};
