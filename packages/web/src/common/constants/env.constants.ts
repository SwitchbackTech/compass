import { z } from "zod";
import { isDev } from "@core/util/env.util";

const webEnvSchema = z.object({
  API_BASEURL: z.string().url(),
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

const parsedWebEnv = webEnvSchema.parse({
  API_BASEURL: process.env.COMPASS_PUBLIC_API_BASEURL,
  GOOGLE_CLIENT_ID: process.env.COMPASS_PUBLIC_GOOGLE_CLIENT_ID,
  NODE_ENV: process.env.NODE_ENV,
  POSTHOG_KEY: process.env.COMPASS_PUBLIC_POSTHOG_KEY,
  POSTHOG_HOST: process.env.COMPASS_PUBLIC_POSTHOG_HOST,
});

export const ENV_WEB = {
  ...parsedWebEnv,
  BACKEND_BASEURL: parsedWebEnv.API_BASEURL.replace(/\/[^/]*$/, ""),
};

export const IS_DEV = isDev(ENV_WEB.NODE_ENV);
