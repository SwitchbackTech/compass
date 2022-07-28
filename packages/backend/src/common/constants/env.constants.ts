import { NodeEnv, PORT_DEFAULT_API } from "@core/constants/core.constants";
import { isDev } from "@core/util/env.util";

const _nodeEnv = process.env["NODE_ENV"] as NodeEnv;
if (!Object.values(NodeEnv).includes(_nodeEnv)) {
  throw new Error(`Invalid NODE_ENV value: '${_nodeEnv}'`);
}

export const IS_DEV = isDev(_nodeEnv);

const googleClientId = IS_DEV
  ? process.env["CLIENT_ID_DEV"]
  : process.env["CLIENT_ID"];

const googleClientSecret = IS_DEV
  ? process.env["CLIENT_SECRET_DEV"]
  : process.env["CLIENT_SECRET"];

const _error = "error!!!";
export const ENV = {
  ACCESS_TOKEN_LIFE: process.env["ACCESS_TOKEN_LIFE"] || _error,
  ACCESS_TOKEN_SECRET: process.env["ACCESS_TOKEN_SECRET"] || _error,
  BASEURL_PROD: process.env["BASEURL_PROD"] || _error,
  CLIENT_ID: googleClientId || _error,
  CLIENT_SECRET: googleClientSecret || _error,
  LOG_LEVEL: process.env["LOG_LEVEL"] || "debug",
  NODE_ENV: _nodeEnv,
  PORT: process.env["PORT"] || PORT_DEFAULT_API,
  REFRESH_TOKEN_LIFE: process.env["REFRESH_TOKEN_LIFE"] || _error,
  REFRESH_TOKEN_SECRET: process.env["REFRESH_TOKEN_SECRET"] || _error,
  SUPERTOKENS_URI: process.env["SUPERTOKENS_URI"] || _error,
  SUPERTOKENS_KEY: process.env["SUPERTOKENS_KEY"] || _error,
};

if (Object.values(ENV).includes(_error)) {
  console.log(
    `Exiting because a critical env value is missing: ${JSON.stringify(ENV)}`
  );
  process.exit(1);
}
