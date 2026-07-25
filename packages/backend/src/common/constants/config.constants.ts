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

const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

const ConfigSchema = z
  .object({
    BASEURL: z.string().nonempty(),
    CHANNEL_EXPIRATION_MIN: z.string().nonempty().default("10080"),
    GOOGLE_CLIENT_ID: z.string().nonempty().optional(),
    GOOGLE_CLIENT_SECRET: z.string().nonempty().optional(),
    DB: z.string().nonempty(),
    EMAILER_SECRET: z.string().nonempty().optional(),
    FRONTEND_URL: z.string().url(),
    GCAL_WEBHOOK_BASEURL: z.string().url(),
    MONGO_URI: z.string().nonempty(),
    MONGO_BATCH_SIZE: z.coerce.number().int().positive().default(1000),
    NODE_ENV: z.nativeEnum(NodeEnv),
    TZ: z.enum(["Etc/UTC", "UTC"]),
    ORIGINS_ALLOWED: z.array(z.string().nonempty()).default([]),
    PORT: z.string().nonempty().default(PORT_DEFAULT_BACKEND.toString()),
    SUPERTOKENS_URI: z.string().nonempty(),
    SUPERTOKENS_KEY: z.string().nonempty(),
    TOKEN_GCAL_NOTIFICATION: z.string().default(""),
    TOKEN_COMPASS_SYNC: z.string().nonempty(),
    // Base URL + shared secret for the Sync service's internal API. Both present
    // (delegation configured) or both absent (legacy-only deployment); a partial
    // configuration is a mistake.
    SYNC_SERVICE_URL: z.string().url().optional(),
    SYNC_INTERNAL_AUTH_TOKEN: z.string().nonempty().optional(),
    // Which implementation serves the browser-facing provider-connection routes.
    // Global, not per-request: legacy (default) or delegate to the Sync service.
    SYNC_CONNECTION_ROUTING: z.enum(["legacy", "sync"]).default("legacy"),
    // Which implementation serves the browser-facing calendar/event reads and
    // durable write commands. Independent of SYNC_CONNECTION_ROUTING so the
    // riskier event path rolls out separately. Global, not per-request.
    SYNC_EVENT_ROUTING: z.enum(["legacy", "sync"]).default("legacy"),
    // Whether cloud event writes and provider-connection changes are accepted.
    // `maintenance` rejects them with a typed MAINTENANCE response (S50).
    SYNC_CLOUD_MUTATION_MODE: z
      .enum(["enabled", "maintenance"])
      .default("enabled"),
    // Mirror of sync.execution for the backend startup guard + operator
    // surface. Sync itself enforces passive/active; the API refuses unsafe
    // dual-writer combinations when this is active and mutations are enabled
    // while any routing remains legacy.
    SYNC_EXECUTION: z.enum(["passive", "active"]).default("passive"),
    POSTHOG_KEY: z.string().nonempty().optional(),
    POSTHOG_HOST: z.string().url().optional(),
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

    // Sync delegation needs both the service URL and the shared secret; one
    // without the other cannot make an authenticated call, so fail loudly.
    if (
      Boolean(env.SYNC_SERVICE_URL) !== Boolean(env.SYNC_INTERNAL_AUTH_TOKEN)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        fatal: true,
        message:
          "Sync delegation requires both SYNC_SERVICE_URL and SYNC_INTERNAL_AUTH_TOKEN, or neither",
        path: env.SYNC_SERVICE_URL
          ? ["SYNC_INTERNAL_AUTH_TOKEN"]
          : ["SYNC_SERVICE_URL"],
      });
    }

    // Delegating connection routes to Sync is meaningless without a Sync client
    // to reach, so refuse to start rather than silently fall back to legacy and
    // hide an operator's misconfigured switch.
    if (env.SYNC_CONNECTION_ROUTING === "sync" && !env.SYNC_SERVICE_URL) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        fatal: true,
        message:
          "SYNC_CONNECTION_ROUTING=sync requires SYNC_SERVICE_URL (and SYNC_INTERNAL_AUTH_TOKEN) to be configured",
        path: ["SYNC_SERVICE_URL"],
      });
    }

    // Same guard for event delegation: a "sync" switch without a client to
    // reach is a misconfiguration, not a silent fall-back to legacy.
    if (env.SYNC_EVENT_ROUTING === "sync" && !env.SYNC_SERVICE_URL) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        fatal: true,
        message:
          "SYNC_EVENT_ROUTING=sync requires SYNC_SERVICE_URL (and SYNC_INTERNAL_AUTH_TOKEN) to be configured",
        path: ["SYNC_SERVICE_URL"],
      });
    }

    // Refuse an active Sync writer while the API still routes any browser
    // path to legacy AND cloud mutations are enabled — that is a dual-writer
    // window. Cutover keeps mutations in `maintenance` until both routes are
    // on Sync (S50 / R-MIG-01).
    const anyLegacyRouting =
      env.SYNC_CONNECTION_ROUTING === "legacy" ||
      env.SYNC_EVENT_ROUTING === "legacy";
    if (
      env.SYNC_EXECUTION === "active" &&
      env.SYNC_CLOUD_MUTATION_MODE === "enabled" &&
      anyLegacyRouting
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        fatal: true,
        message:
          "SYNC_EXECUTION=active with SYNC_CLOUD_MUTATION_MODE=enabled requires both SYNC_CONNECTION_ROUTING and SYNC_EVENT_ROUTING to be sync (refuse dual-writer). Enter maintenance or keep Sync passive while any routing remains legacy",
        path: ["SYNC_EXECUTION"],
      });
    }
  });

export type Config = z.infer<typeof ConfigSchema>;

const toStr = (
  value: string | number | null | undefined,
): string | undefined => (value != null ? String(value) : undefined);

const nonEmpty = (value: string | null | undefined): string | undefined =>
  value?.trim() ? value : undefined;

export function parseRawConfig(config: CompassConfig): Config {
  const nodeEnv = config.runtime.nodeEnv as NodeEnv;

  return ConfigSchema.parse({
    BASEURL: config.backend.apiUrl,
    CHANNEL_EXPIRATION_MIN:
      toStr(config.google?.channelExpirationMin) ?? "10080",
    GOOGLE_CLIENT_ID: nonEmpty(config.google?.clientId),
    GOOGLE_CLIENT_SECRET: nonEmpty(config.google?.clientSecret),
    DB: isDev(nodeEnv) ? "dev_calendar" : "prod_calendar",
    EMAILER_SECRET: nonEmpty(config.email?.kitApiSecret),
    FRONTEND_URL: config.web.url,
    GCAL_WEBHOOK_BASEURL:
      nonEmpty(config.google?.webhookUrl) || config.backend.apiUrl,
    MONGO_URI: config.mongo.uri,
    MONGO_BATCH_SIZE: 1000,
    NODE_ENV: nodeEnv,
    TZ: config.runtime.timezone,
    ORIGINS_ALLOWED: config.backend.originsAllowed ?? [],
    PORT: toStr(config.backend.port),
    SUPERTOKENS_URI: config.supertokens.uri,
    SUPERTOKENS_KEY: config.supertokens.key,
    TOKEN_GCAL_NOTIFICATION: nonEmpty(config.google?.notificationToken) ?? "",
    TOKEN_COMPASS_SYNC: config.backend.compassToken,
    // `serviceUrl` is the sole delegation signal: a deployment running the
    // standalone Sync service always sets `internalAuthToken`, but that alone
    // must NOT enable backend delegation (it would trip the both-or-neither
    // check and refuse to start). Only inherit the shared secret once a
    // serviceUrl is present, so the backend targets the same secret Sync
    // verifies with.
    SYNC_SERVICE_URL: nonEmpty(config.sync?.serviceUrl),
    SYNC_INTERNAL_AUTH_TOKEN: nonEmpty(config.sync?.serviceUrl)
      ? nonEmpty(config.sync?.internalAuthToken)
      : undefined,
    SYNC_CONNECTION_ROUTING: config.sync?.connectionRouting,
    SYNC_EVENT_ROUTING: config.sync?.eventRouting,
    SYNC_CLOUD_MUTATION_MODE: config.sync?.cloudMutationMode,
    SYNC_EXECUTION: config.sync?.execution,
    POSTHOG_KEY: nonEmpty(config.posthog?.key),
    POSTHOG_HOST: nonEmpty(config.posthog?.host) || DEFAULT_POSTHOG_HOST,
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
    FRONTEND_URL: rawEnv["FRONTEND_URL"],
    GCAL_WEBHOOK_BASEURL: rawEnv["GCAL_WEBHOOK_BASEURL"] || rawEnv["BASEURL"],
    MONGO_URI: rawEnv["MONGO_URI"],
    MONGO_BATCH_SIZE: rawEnv["MONGO_BATCH_SIZE"],
    NODE_ENV: nodeEnv,
    TZ: rawEnv["TZ"],
    ORIGINS_ALLOWED: rawEnv["CORS"] ? rawEnv["CORS"].split(",") : [],
    PORT: rawEnv["PORT"],
    SUPERTOKENS_URI: rawEnv["SUPERTOKENS_URI"],
    SUPERTOKENS_KEY: rawEnv["SUPERTOKENS_KEY"],
    TOKEN_GCAL_NOTIFICATION: rawEnv["TOKEN_GCAL_NOTIFICATION"],
    TOKEN_COMPASS_SYNC: rawEnv["TOKEN_COMPASS_SYNC"],
    // nonEmpty so a var set to "" reads as unset (not-configured) rather than
    // failing url()/nonempty(); mirrors the config-file path and keeps the
    // both-or-neither check honest.
    SYNC_SERVICE_URL: nonEmpty(rawEnv["SYNC_SERVICE_URL"]),
    SYNC_INTERNAL_AUTH_TOKEN: nonEmpty(rawEnv["SYNC_INTERNAL_AUTH_TOKEN"]),
    SYNC_CONNECTION_ROUTING: nonEmpty(rawEnv["SYNC_CONNECTION_ROUTING"]),
    SYNC_EVENT_ROUTING: nonEmpty(rawEnv["SYNC_EVENT_ROUTING"]),
    SYNC_CLOUD_MUTATION_MODE: nonEmpty(rawEnv["SYNC_CLOUD_MUTATION_MODE"]),
    SYNC_EXECUTION: nonEmpty(rawEnv["SYNC_EXECUTION"]),
    POSTHOG_KEY: rawEnv["POSTHOG_KEY"],
    POSTHOG_HOST: rawEnv["POSTHOG_HOST"] || DEFAULT_POSTHOG_HOST,
  });
}

const isTestWithoutConfig =
  process.env["NODE_ENV"] === "test" && !process.env["COMPASS_CONFIG_FILE"];

let parsedConfig: Config;

try {
  if (isTestWithoutConfig) {
    parsedConfig = parseConfigFromEnv(process.env);
  } else {
    const rawConfig = loadCompassConfig();
    // Honor runtime.logLevel from the config file. Winston and the request
    // logger read LOG_LEVEL from the environment, so surface it there.
    if (rawConfig.runtime.logLevel) {
      process.env["LOG_LEVEL"] = rawConfig.runtime.logLevel;
    }
    parsedConfig = parseRawConfig(rawConfig);
  }
} catch (error) {
  logger.error(
    "Exiting because a critical config value is missing or invalid:",
  );
  console.error(error);
  process.exit(1);
}

export const CONFIG = parsedConfig;
export const IS_DEV = isDev(CONFIG.NODE_ENV);

logger.info(
  `Sync cutover: execution=${CONFIG.SYNC_EXECUTION} connectionRouting=${CONFIG.SYNC_CONNECTION_ROUTING} eventRouting=${CONFIG.SYNC_EVENT_ROUTING} cloudMutationMode=${CONFIG.SYNC_CLOUD_MUTATION_MODE}`,
);
