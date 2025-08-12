import { isDev } from "@core/util/env.util";

export const IS_DEV = isDev(process.env["NODE_ENV"]);

const API_BASEURL =
  process.env["API_BASEURL"] || `http://localhost:${process.env["PORT"]}`;
const BACKEND_BASEURL = API_BASEURL.replace(/\/[^/]*$/, "");

export const ENV_WEB = {
  API_BASEURL,
  BACKEND_BASEURL,
  CLIENT_ID: process.env["GOOGLE_CLIENT_ID"],
  POSTHOG_KEY: process.env["POSTHOG_KEY"],
  POSTHOG_HOST: process.env["POSTHOG_HOST"],
};
