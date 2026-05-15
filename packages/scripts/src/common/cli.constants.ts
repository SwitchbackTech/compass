import { loadCompassConfig } from "@core/config/compass.config";

export const COMPASS_ROOT_DEV = process.cwd();
export const COMPASS_BUILD_DEV = `${COMPASS_ROOT_DEV}/build`;

export const cliConfigValues = {
  backendApiUrl: "",
  webUrl: "",
};

export const loadCliConfigValues = () => {
  const config = loadCompassConfig();

  cliConfigValues.backendApiUrl = config.backend.apiUrl;
  cliConfigValues.webUrl = config.web.url;
};
