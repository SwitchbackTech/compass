import { z } from "zod";
import {
  type CompassConfig,
  loadCompassConfig,
} from "@core/config/compass.config";
import { NodeEnv, PORT_DEFAULT_BACKEND } from "@core/constants/core.constants";
import { Logger } from "@core/logger/winston.logger";
import { isDev } from "@core/util/env.util";
import {
  isGoogleClientIdValid,
  isGoogleClientSecretValid,
} from "./config.util";

const logger = Logger("app:constants");

const ConfigSchema = z
  .object({
    BASEURL: z.string().nonempty(),
    CHANNEL_EXPIRATION_MIN: z.string().nonempty().default("10"),
    GOOGLE_CLIENT_ID: z.string().nonempty().optional(),
    GOOGLE_CLIENT_SECRET: z.string().nonempty().optional(),
    DB: z.string().nonempty(),
    EMAILER_SECRET: z.string().nonempty().optional(),
    EMAILER_USER_TAG_ID: z.string().nonempty().optional(),
    FRONTEND_URL: z.string().url(),
    GCAL_WEBHOOK_BASEURL: z.string().url(),
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
    const hasGoogleClientId = isGoogleClientIdValid(env.GOOGLE_CLIENT_ID);
    const hasGoogleClientSecret = isGoogleClientSecretValid(
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
      env.GCAL_WEBHOOK_BASEURL.startsWith("https://");

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

export type Config = z.infer<typeof ConfigSchema>;

const toStr = (
  value: string | number | null | undefined,
): string | undefined => (value != null ? String(value) : undefined);

const nonEmpty = (value: string | null | undefined): string | undefined =>
  value?.trim() ? value : undefined;

function parseRawConfig(config: CompassConfig): Config {
  const nodeEnv = config.runtime.nodeEnv as NodeEnv;

  return ConfigSchema.parse({
    BASEURL: config.backend.apiUrl,
    CHANNEL_EXPIRATION_MIN: toStr(config.google?.channelExpirationMin) ?? "10",
    GOOGLE_CLIENT_ID: nonEmpty(config.google?.clientId),
    GOOGLE_CLIENT_SECRET: nonEmpty(config.google?.clientSecret),
    DB: isDev(nodeEnv) ? "dev_calendar" : "prod_calendar",
    EMAILER_SECRET: nonEmpty(config.email?.kitApiSecret),
    EMAILER_USER_TAG_ID: toStr(config.email?.kitUserTagId),
    FRONTEND_URL: config.web.url,
    GCAL_WEBHOOK_BASEURL:
      nonEmpty(config.google?.webhookUrl) || config.backend.apiUrl,
    MONGO_URI: config.mongo.uri,
    NODE_ENV: nodeEnv,
    TZ: config.runtime.timezone,
    ORIGINS_ALLOWED: config.backend.originsAllowed ?? [],
    PORT: toStr(config.backend.port),
    SUPERTOKENS_URI: config.supertokens.uri,
    SUPERTOKENS_KEY: config.supertokens.key,
    TOKEN_GCAL_NOTIFICATION: nonEmpty(config.google?.notificationToken) ?? "",
    TOKEN_COMPASS_SYNC: config.backend.compassToken,
  });
}

export function parseConfigFromEnv(
  rawEnv: Record<string, string | undefined>,
): Config {
  const nodeEnv = rawEnv["NODE_ENV"] as NodeEnv;

  return ConfigSchema.parse({
    BASEURL: rawEnv["BASEURL"],
    CHANNEL_EXPIRATION_MIN: rawEnv["CHANNEL_EXPIRATION_MIN"],
    GOOGLE_CLIENT_ID: rawEnv["GOOGLE_CLIENT_ID"],
    GOOGLE_CLIENT_SECRET: rawEnv["GOOGLE_CLIENT_SECRET"],
    DB: isDev(nodeEnv) ? "dev_calendar" : "prod_calendar",
    EMAILER_SECRET: rawEnv["EMAILER_API_SECRET"],
    EMAILER_USER_TAG_ID: rawEnv["EMAILER_USER_TAG_ID"],
    FRONTEND_URL: rawEnv["FRONTEND_URL"],
    GCAL_WEBHOOK_BASEURL: rawEnv["GCAL_WEBHOOK_BASEURL"] || rawEnv["BASEURL"],
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

let parsedConfig: Config;

try {
  parsedConfig = isTestWithoutConfig
    ? parseConfigFromEnv(process.env)
    : parseRawConfig(loadCompassConfig());
} catch (error) {
  logger.error(
    "Exiting because a critical config value is missing or invalid:",
  );
  console.error(error);
  process.exit(1);
}

export const CONFIG = parsedConfig;
export const IS_DEV = isDev(CONFIG.NODE_ENV);
