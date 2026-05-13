import { loadCompassEnv } from "@core/config/compass.config";

type CliEnv = {
  BASEURL: string;
  FRONTEND_URL: string;
  DEV_BROWSER: string | undefined;
};

export const COMPASS_ROOT_DEV = process.cwd();
export const COMPASS_BUILD_DEV = `${COMPASS_ROOT_DEV}/build`;

let cachedCliEnv: CliEnv | undefined;

export const getCliEnv = (): CliEnv => {
  if (cachedCliEnv) {
    return cachedCliEnv;
  }

  const compassEnv = loadCompassEnv();
  Object.assign(process.env, compassEnv);

  cachedCliEnv = {
    BASEURL: compassEnv["BASEURL"] || `http://localhost:3000/api`,
    FRONTEND_URL: compassEnv["FRONTEND_URL"] || `http://localhost:9080`,
    DEV_BROWSER: process.env["DEV_BROWSER"],
  };

  return cachedCliEnv;
};
