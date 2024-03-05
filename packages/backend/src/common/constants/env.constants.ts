import { NodeEnv, PORT_DEFAULT_API } from "@core/constants/core.constants";
import { isDev } from "@core/util/env.util";

const _nodeEnv = process.env["NODE_ENV"] as NodeEnv;
if (!Object.values(NodeEnv).includes(_nodeEnv)) {
  throw new Error(`Invalid NODE_ENV value: '${_nodeEnv}'`);
}

export const IS_DEV = isDev(_nodeEnv);
const db = IS_DEV ? "dev_calendar" : "prod_calendar";

const _error = ">> TODO: set this value in .env <<";

export const ENV = {
  BASEURL: process.env["BASEURL"] as string,
  CHANNEL_EXPIRATION_MIN: process.env["CHANNEL_EXPIRATION_MIN"] || "10",
  CLIENT_ID: process.env["CLIENT_ID"] || _error,
  CLIENT_SECRET: process.env["CLIENT_SECRET"] || _error,
  DB: db,
  EMAILER_KEY: process.env["EMAILER_API_KEY"] || _error,
  EMAILER_SECRET: process.env["EMAILER_API_SECRET"] || _error,
  EMAILER_LIST_ID: process.env["EMAILER_LIST_ID"] || _error,
  MONGO_URI: process.env["MONGO_URI"] || _error,
  NODE_ENV: _nodeEnv,
  PORT: process.env["PORT"] || PORT_DEFAULT_API,
  SUPERTOKENS_URI: process.env["SUPERTOKENS_URI"] || _error,
  SUPERTOKENS_KEY: process.env["SUPERTOKENS_KEY"] || _error,
  TOKEN_GCAL_NOTIFICATION: process.env["TOKEN_GCAL_NOTIFICATION"] || _error,
  TOKEN_COMPASS_SYNC: process.env["TOKEN_COMPASS_SYNC"] || _error,
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
