import { z } from "zod";
import { SELF_HOST_GOOGLE_CLIENT_ID_PLACEHOLDER } from "@core/constants/core.constants";
import { isDev } from "@core/util/env.util";

export const getApiBaseUrl = (apiBaseUrl?: string, port?: string): string => {
  if (apiBaseUrl) {
    return apiBaseUrl;
  }

  if (!port) {
    throw new Error("PORT is required when API_BASEURL is not configured");
  }

  return `http://localhost:${port}/api`;
};

const API_BASEURL = getApiBaseUrl(process.env.API_BASEURL, process.env.PORT);
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
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  NODE_ENV: process.env.NODE_ENV,
  POSTHOG_KEY: process.env.POSTHOG_KEY,
  POSTHOG_HOST: process.env.POSTHOG_HOST,
});

export const IS_DEV = isDev(ENV_WEB.NODE_ENV);

export const isGoogleAuthConfigured = (clientId?: string): boolean =>
  Boolean(
    clientId &&
      clientId !== "undefined" &&
      clientId !== SELF_HOST_GOOGLE_CLIENT_ID_PLACEHOLDER,
  );

export const IS_GOOGLE_AUTH_CONFIGURED = isGoogleAuthConfigured(
  ENV_WEB.GOOGLE_CLIENT_ID,
);
