type CliEnv = {
  FRONTEND_URL: string;
  DEV_BROWSER: string | undefined;
};

export const CLI_ENV: CliEnv = {
  FRONTEND_URL: process.env["FRONTEND_URL"] || `http://localhost:9080`,
  DEV_BROWSER: process.env["DEV_BROWSER"],
};
