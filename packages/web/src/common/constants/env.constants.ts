import { z } from "zod";
import { isDev } from "@core/util/env.util";

const API_BASEURL =
  process.env["API_BASEURL"] || `http://localhost:${process.env["PORT"]}`;
const BACKEND_BASEURL = API_BASEURL.replace(/\/[^/]*$/, "");

const webEnvSchema = z.object({
  API_BASEURL: z.string().url(),
  BACKEND_BASEURL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  NODE_ENV: z.string(),
  POSTHOG_KEY: z
    .string()
    .optional()
    .transform((val) => (val === "undefined" ? undefined : val)),
  POSTHOG_HOST: z
    .string()
    .optional()
    .transform((val) => (val === "undefined" ? undefined : val)),
});

export const ENV_WEB = webEnvSchema.parse({
  API_BASEURL,
  BACKEND_BASEURL,
  GOOGLE_CLIENT_ID: process.env["GOOGLE_CLIENT_ID"],
  NODE_ENV: process.env["NODE_ENV"],
  POSTHOG_KEY: process.env["POSTHOG_KEY"],
  POSTHOG_HOST: process.env["POSTHOG_HOST"],
});

export const IS_DEV = isDev(ENV_WEB.NODE_ENV);
