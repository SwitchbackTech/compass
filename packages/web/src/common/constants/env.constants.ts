import { isDev } from "@core/util/env.util";

export const IS_DEV = isDev(process.env["NODE_ENV"]);

export const ENV_WEB = {
  API_BASEURL: process.env["API_BASEURL"],
  API_BASEURL_SYNC: process.env["API_BASEURL_SYNC"],
  CLIENT_ID: process.env["GOOGLE_CLIENT_ID"],
};
