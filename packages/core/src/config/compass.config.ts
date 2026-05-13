import { parseDocument } from "yaml";
import { z } from "zod";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type CompassEnv = Record<string, string | undefined>;

const optionalString = z.string().nullish();

const CompassConfigSchema = z
  .object({
    compose: z
      .object({
        version: z.union([z.string(), z.number()]).optional(),
      })
      .optional(),
    ports: z
      .object({
        web: z.union([z.string(), z.number()]).optional(),
        backend: z.union([z.string(), z.number()]).optional(),
      })
      .optional(),
    runtime: z.object({
      nodeEnv: z.string(),
      timezone: z.string(),
      logLevel: z.string().optional(),
    }),
    urls: z.object({
      frontend: z.string(),
      backendApi: z.string(),
      cors: z.array(z.string()).optional(),
      googleWebhook: optionalString,
      health: optionalString,
    }),
    mongo: z.object({
      username: z.string().optional(),
      password: z.string().optional(),
      replicaSetKey: z.string().optional(),
      uri: z.string(),
    }),
    supertokens: z.object({
      uri: z.string(),
      key: z.string(),
      postgres: z
        .object({
          user: z.string().optional(),
          password: z.string().optional(),
          database: z.string().optional(),
        })
        .nullish(),
    }),
    tokens: z.object({
      compassSync: z.string(),
      googleCalendarNotification: z.string().optional(),
    }),
    google: z
      .object({
        clientId: optionalString,
        clientSecret: optionalString,
        channelExpirationMin: z.union([z.string(), z.number()]).optional(),
      })
      .nullish(),
    email: z
      .object({
        kitApiSecret: optionalString,
        kitUserTagId: z.union([z.string(), z.number()]).optional(),
      })
      .nullish(),
    posthog: z
      .object({
        key: optionalString,
        host: optionalString,
      })
      .nullish(),
  })
  .strict();

export type CompassConfig = z.infer<typeof CompassConfigSchema>;

const toOptionalString = (
  value: string | number | null | undefined,
): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  return String(value);
};

const optionalNonEmpty = (
  value: string | null | undefined,
): string | undefined => (value?.trim() ? value : undefined);

export function parseCompassConfigText(
  text: string,
  filePath: string,
): CompassConfig {
  const document = parseDocument(text);

  if (document.errors.length > 0) {
    throw new Error(
      `Could not parse Compass config file ${filePath}: ${document.errors[0]?.message}`,
    );
  }

  const parsed = CompassConfigSchema.safeParse(document.toJS());

  if (!parsed.success) {
    throw new Error(
      `Invalid Compass config file ${filePath}: ${parsed.error.message}`,
    );
  }

  return parsed.data;
}

export function mapCompassConfigToEnv(config: CompassConfig): CompassEnv {
  return {
    BASEURL: config.urls.backendApi,
    CHANNEL_EXPIRATION_MIN:
      toOptionalString(config.google?.channelExpirationMin) ?? "10",
    COMPASS_HEALTH_URL: optionalNonEmpty(config.urls.health),
    COMPASS_VERSION: toOptionalString(config.compose?.version),
    CORS: config.urls.cors?.join(",") ?? "",
    EMAILER_API_SECRET: optionalNonEmpty(config.email?.kitApiSecret),
    EMAILER_USER_TAG_ID: toOptionalString(config.email?.kitUserTagId),
    FRONTEND_URL: config.urls.frontend,
    GCAL_WEBHOOK_BASEURL: optionalNonEmpty(config.urls.googleWebhook),
    GOOGLE_CLIENT_ID: optionalNonEmpty(config.google?.clientId),
    GOOGLE_CLIENT_SECRET: optionalNonEmpty(config.google?.clientSecret),
    LOG_LEVEL: config.runtime.logLevel,
    MONGO_INITDB_ROOT_PASSWORD: optionalNonEmpty(config.mongo.password),
    MONGO_INITDB_ROOT_USERNAME: optionalNonEmpty(config.mongo.username),
    MONGO_REPLICA_SET_KEY: optionalNonEmpty(config.mongo.replicaSetKey),
    MONGO_URI: config.mongo.uri,
    NODE_ENV: config.runtime.nodeEnv,
    PORT: toOptionalString(config.ports?.backend),
    POSTHOG_HOST: optionalNonEmpty(config.posthog?.host),
    POSTHOG_KEY: optionalNonEmpty(config.posthog?.key),
    SUPERTOKENS_KEY: config.supertokens.key,
    SUPERTOKENS_POSTGRES_DB: optionalNonEmpty(
      config.supertokens.postgres?.database,
    ),
    SUPERTOKENS_POSTGRES_PASSWORD: optionalNonEmpty(
      config.supertokens.postgres?.password,
    ),
    SUPERTOKENS_POSTGRES_USER: optionalNonEmpty(
      config.supertokens.postgres?.user,
    ),
    SUPERTOKENS_URI: config.supertokens.uri,
    TOKEN_COMPASS_SYNC: config.tokens.compassSync,
    TOKEN_GCAL_NOTIFICATION:
      optionalNonEmpty(config.tokens.googleCalendarNotification) ?? "",
    TZ: config.runtime.timezone,
    WEB_PORT: toOptionalString(config.ports?.web),
  };
}

export function findCompassConfigFile(
  explicitPath = process.env["COMPASS_CONFIG_FILE"],
): string {
  if (explicitPath) {
    return resolve(explicitPath);
  }

  const candidates = [
    resolve(process.cwd(), "compass.yaml"),
    resolve(process.cwd(), "packages/backend/compass.yaml"),
    resolve(process.cwd(), "../backend/compass.yaml"),
    "/app/compass.yaml",
  ];

  const configPath = candidates.find((candidate) => existsSync(candidate));

  if (!configPath) {
    throw new Error(
      "Missing Compass config file. Create packages/backend/compass.yaml from packages/backend/compass.example.yaml or set COMPASS_CONFIG_FILE.",
    );
  }

  return configPath;
}

export function loadCompassConfigFile(filePath = findCompassConfigFile()) {
  return parseCompassConfigText(readFileSync(filePath, "utf8"), filePath);
}

export function loadCompassEnv(filePath?: string): CompassEnv {
  return mapCompassConfigToEnv(loadCompassConfigFile(filePath));
}
