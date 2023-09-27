import { isDev } from "@core/util/env.util";

export const IS_DEV = isDev(process.env["NODE_ENV"]);

export const ENV_WEB = {
  API_BASEURL:
    process.env["API_BASEURL"] || `http://localhost:${process.env["PORT"]}`,
  CLIENT_ID: process.env["GOOGLE_CLIENT_ID"],
};
