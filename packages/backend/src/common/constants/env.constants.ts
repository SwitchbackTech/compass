import { z } from "zod";
import {
  loadCompassConfig,
  type CompassConfig,
} from "@core/config/compass.config";
import {
  NodeEnv,
  PORT_DEFAULT_BACKEND,
  SELF_HOST_GOOGLE_CLIENT_ID_PLACEHOLDER,
  SELF_HOST_GOOGLE_CLIENT_SECRET_PLACEHOLDER,
} from "@core/constants/core.constants";
import { Logger } from "@core/logger/winston.logger";
import { isDev } from "@core/util/env.util";

const logger = Logger("app:constants");

const EnvSchema = z
  .object({
    BASEURL: z.string().nonempty(),
    CHANNEL_EXPIRATION_MIN: z.string().nonempty().default("10"),
    GOOGLE_CLIENT_ID: z.string().nonempty().optional(),
    GOOGLE_CLIENT_SECRET: z.string().nonempty().optional(),
    DB: z.string().nonempty(),
    EMAILER_SECRET: z.string().nonempty().optional(),
    EMAILER_USER_TAG_ID: z.string().nonempty().optional(),
    FRONTEND_URL: z.string().url(),
    GCAL_WEBHOOK_BASEURL: z
      .string()
      .url()
      .refine((url) => url.startsWith("https://"), {
        message: "GCAL_WEBHOOK_BASEURL must use HTTPS",
      })
      .optional(),
    MONGO_URI: z.string().nonempty(),
    NODE_ENV: z.nativeEnum(NodeEnv),
    TZ: z.enum(["Etc/UTC", "UTC"]),
    ORIGINS_ALLOWED: z.array(z.string().nonempty()).default([]),
    PORT: z.string().nonempty().default(PORT_DEFAULT_BACKEND.toString()),
    SUPERTOKENS_URI: z.string().nonempty(),
    SUPERTOKENS_KEY: z.string().nonempty(),
    TOKEN_GCAL_NOTIFICATION: z.string().default(""),
    TOKEN_COMPASS_SYNC: z.string().nonempty(),
  })
  .strict()
  .superRefine((env, context) => {
    const hasGoogleClientId = isUsableGoogleClientId(env.GOOGLE_CLIENT_ID);
    const hasGoogleClientSecret = isUsableGoogleClientSecret(
      env.GOOGLE_CLIENT_SECRET,
    );
    const isGoogleConfigComplete = hasGoogleClientId && hasGoogleClientSecret;

    if (hasGoogleClientId !== hasGoogleClientSecret) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        fatal: true,
        message: "Google configuration requires both client ID and secret",
        path: hasGoogleClientId
          ? ["GOOGLE_CLIENT_SECRET"]
          : ["GOOGLE_CLIENT_ID"],
      });
    }

    const usesHttpsGoogleWebhook =
      env.GCAL_WEBHOOK_BASEURL?.startsWith("https://") ||
      env.BASEURL.startsWith("https://");

    if (
      isGoogleConfigComplete &&
      usesHttpsGoogleWebhook &&
      !env.TOKEN_GCAL_NOTIFICATION
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        fatal: true,
        message:
          "Google Calendar webhook notifications require TOKEN_GCAL_NOTIFICATION when Google webhook URL uses HTTPS",
        path: ["TOKEN_GCAL_NOTIFICATION"],
      });
    }
  });

export type BackendEnv = z.infer<typeof EnvSchema>;

const isUsableGoogleClientId = (clientId?: string): boolean =>
  Boolean(
    clientId &&
      clientId !== "undefined" &&
      clientId !== SELF_HOST_GOOGLE_CLIENT_ID_PLACEHOLDER,
  );

const isUsableGoogleClientSecret = (clientSecret?: string): boolean =>
  Boolean(
    clientSecret &&
      clientSecret !== "undefined" &&
      clientSecret !== SELF_HOST_GOOGLE_CLIENT_SECRET_PLACEHOLDER,
  );

export const isGoogleConfigured = (
  env: Pick<BackendEnv, "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET">,
): boolean =>
  isUsableGoogleClientId(env.GOOGLE_CLIENT_ID) &&
  isUsableGoogleClientSecret(env.GOOGLE_CLIENT_SECRET);

const toStr = (
  value: string | number | null | undefined,
): string | undefined => (value != null ? String(value) : undefined);

const nonEmpty = (value: string | null | undefined): string | undefined =>
  value?.trim() ? value : undefined;

// Build BackendEnv directly from the parsed CompassConfig (normal runtime).
export function parseBackendConfig(config: CompassConfig): BackendEnv {
  const nodeEnv = config.runtime.nodeEnv as NodeEnv;

  return EnvSchema.parse({
    BASEURL: config.urls.backendApi,
    CHANNEL_EXPIRATION_MIN:
      toStr(config.google?.channelExpirationMin) ?? "10",
    GOOGLE_CLIENT_ID: nonEmpty(config.google?.clientId),
    GOOGLE_CLIENT_SECRET: nonEmpty(config.google?.clientSecret),
    DB: isDev(nodeEnv) ? "dev_calendar" : "prod_calendar",
    EMAILER_SECRET: nonEmpty(config.email?.kitApiSecret),
    EMAILER_USER_TAG_ID: toStr(config.email?.kitUserTagId),
    FRONTEND_URL: config.urls.frontend,
    GCAL_WEBHOOK_BASEURL: nonEmpty(config.urls.googleWebhook) || undefined,
    MONGO_URI: config.mongo.uri,
    NODE_ENV: nodeEnv,
    TZ: config.runtime.timezone,
    ORIGINS_ALLOWED: config.urls.cors ?? [],
    PORT: toStr(config.ports?.backend),
    SUPERTOKENS_URI: config.supertokens.uri,
    SUPERTOKENS_KEY: config.supertokens.key,
    TOKEN_GCAL_NOTIFICATION:
      nonEmpty(config.tokens.googleCalendarNotification) ?? "",
    TOKEN_COMPASS_SYNC: config.tokens.compassSync,
  });
}

// Build BackendEnv from process.env — used only in test mode when no
// COMPASS_CONFIG_FILE is set, since tests inject env vars directly.
export function parseBackendEnv(
  rawEnv: Record<string, string | undefined>,
): BackendEnv {
  const nodeEnv = rawEnv["NODE_ENV"] as NodeEnv;

  return EnvSchema.parse({
    BASEURL: rawEnv["BASEURL"],
    CHANNEL_EXPIRATION_MIN: rawEnv["CHANNEL_EXPIRATION_MIN"],
    GOOGLE_CLIENT_ID: rawEnv["GOOGLE_CLIENT_ID"],
    GOOGLE_CLIENT_SECRET: rawEnv["GOOGLE_CLIENT_SECRET"],
    DB: isDev(nodeEnv) ? "dev_calendar" : "prod_calendar",
    EMAILER_SECRET: rawEnv["EMAILER_API_SECRET"],
    EMAILER_USER_TAG_ID: rawEnv["EMAILER_USER_TAG_ID"],
    FRONTEND_URL: rawEnv["FRONTEND_URL"],
    GCAL_WEBHOOK_BASEURL: rawEnv["GCAL_WEBHOOK_BASEURL"] || undefined,
    MONGO_URI: rawEnv["MONGO_URI"],
    NODE_ENV: nodeEnv,
    TZ: rawEnv["TZ"],
    ORIGINS_ALLOWED: rawEnv["CORS"] ? rawEnv["CORS"].split(",") : [],
    PORT: rawEnv["PORT"],
    SUPERTOKENS_URI: rawEnv["SUPERTOKENS_URI"],
    SUPERTOKENS_KEY: rawEnv["SUPERTOKENS_KEY"],
    TOKEN_GCAL_NOTIFICATION: rawEnv["TOKEN_GCAL_NOTIFICATION"],
    TOKEN_COMPASS_SYNC: rawEnv["TOKEN_COMPASS_SYNC"],
  });
}

const isTestWithoutConfig =
  process.env["NODE_ENV"] === "test" && !process.env["COMPASS_CONFIG_FILE"];

let parsedEnv: BackendEnv;

try {
  parsedEnv = isTestWithoutConfig
    ? parseBackendEnv(process.env)
    : parseBackendConfig(loadCompassConfig());
} catch (error) {
  logger.error("Exiting because a critical config value is missing or invalid:");
  console.error(error);
  process.exit(1);
}

export const ENV = parsedEnv;
export const IS_DEV = isDev(ENV.NODE_ENV);
export const IS_GOOGLE_CONFIGURED = isGoogleConfigured(ENV);

export function getApiBaseURL(): string {
  if (!ENV.BASEURL?.trim()) {
    throw new Error("ENV.BASEURL is not set");
  }

  return ENV.BASEURL;
}
