import { z } from "zod";
import { NodeEnv, PORT_DEFAULT_BACKEND } from "@core/constants/core.constants";
import { Logger } from "@core/logger/winston.logger";
import { isDev } from "@core/util/env.util";

const logger = Logger("app:constants");

const _nodeEnv = process.env["NODE_ENV"] as NodeEnv;

if (!Object.values(NodeEnv).includes(_nodeEnv)) {
  throw new Error(`Invalid NODE_ENV value: '${_nodeEnv}'`);
}

export const IS_DEV = isDev(_nodeEnv);

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
    const hasGoogleClientId = Boolean(env.GOOGLE_CLIENT_ID);
    const hasGoogleClientSecret = Boolean(env.GOOGLE_CLIENT_SECRET);
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

    if (
      isGoogleConfigComplete &&
      env.BASEURL.startsWith("https://") &&
      !env.TOKEN_GCAL_NOTIFICATION
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        fatal: true,
        message:
          "Google Calendar webhook notifications require TOKEN_GCAL_NOTIFICATION when BASEURL uses HTTPS",
        path: ["TOKEN_GCAL_NOTIFICATION"],
      });
    }
  });

type RawBackendEnv = Record<string, string | undefined>;

export type BackendEnv = z.infer<typeof EnvSchema>;

export const isGoogleConfigured = (
  env: Pick<BackendEnv, "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET">,
): boolean => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

export function parseBackendEnv(rawEnv: RawBackendEnv): BackendEnv {
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

let parsedEnv: BackendEnv;

try {
  parsedEnv = parseBackendEnv(process.env);
} catch (error) {
  logger.error(`Exiting because a critical env value is missing or invalid:`);
  console.error(error);
  process.exit(1);
}

export const ENV = parsedEnv;
export const IS_GOOGLE_CONFIGURED = isGoogleConfigured(ENV);

export function getApiBaseURL(): string {
  if (!ENV.BASEURL?.trim()) {
    throw new Error("ENV.BASEURL is not set");
  }

  return ENV.BASEURL;
}
