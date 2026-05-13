import { loadCompassConfig } from "@core/config/compass.config";

export const COMPASS_ROOT_DEV = process.cwd();
export const COMPASS_BUILD_DEV = `${COMPASS_ROOT_DEV}/build`;

export const getCliConfig = () => {
  const config = loadCompassConfig();
  return {
    BASEURL: config.urls.backendApi,
    FRONTEND_URL: config.urls.frontend,
    DEV_BROWSER: process.env["DEV_BROWSER"],
  };
};
