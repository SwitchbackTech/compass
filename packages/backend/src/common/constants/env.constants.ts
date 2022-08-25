import { NodeEnv, PORT_DEFAULT_API } from "@core/constants/core.constants";
import { isDev } from "@core/util/env.util";

const _nodeEnv = process.env["NODE_ENV"] as NodeEnv;
if (!Object.values(NodeEnv).includes(_nodeEnv)) {
  throw new Error(`Invalid NODE_ENV value: '${_nodeEnv}'`);
}

export const IS_DEV = isDev(_nodeEnv);

//++ TODO: allow connecting to test if running from jest
const db = IS_DEV ? "dev_calendar" : "prod_calendar";
const googleClientId = IS_DEV
  ? process.env["CLIENT_ID_DEV"]
  : process.env["CLIENT_ID"];

const googleClientSecret = IS_DEV
  ? process.env["CLIENT_SECRET_DEV"]
  : process.env["CLIENT_SECRET"];

const mongoUri = IS_DEV
  ? process.env["MONGO_URI_DEV"]
  : process.env["MONGO_URI_PROD"];

const _error = "error!!!";
export const ENV = {
  BASEURL: process.env["BASEURL"] || _error,
  CHANNEL_EXPIRATION_MIN: process.env["CHANNEL_EXPIRATION_MIN"] || _error,
  CLIENT_ID: googleClientId || _error,
  CLIENT_SECRET: googleClientSecret || _error,
  DB: db,
  LOG_LEVEL: process.env["LOG_LEVEL"] || "debug",
  MONGO_URI: mongoUri || "mongodb://localhost:27017/",
  NODE_ENV: _nodeEnv,
  PORT: process.env["PORT"] || PORT_DEFAULT_API,
  SUPERTOKENS_DEV_URI: process.env["SUPERTOKENS_DEV_URI"] || _error,
  SUPERTOKENS_DEV_KEY: process.env["SUPERTOKENS_DEV_KEY"] || _error,
  SUPERTOKENS_PROD_URI: process.env["SUPERTOKENS_PROD_URI"] || _error,
  SUPERTOKENS_PROD_KEY: process.env["SUPERTOKENS_PROD_KEY"] || _error,
};

if (Object.values(ENV).includes(_error)) {
  console.log(
    `Exiting because a critical env value is missing: ${JSON.stringify(
      ENV,
      null,
      2
    )}`
  );
  process.exit(1);
}
