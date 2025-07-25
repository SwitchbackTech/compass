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
    CLIENT_ID: z.string().nonempty(),
    CLIENT_SECRET: z.string().nonempty(),
    DB: z.string().nonempty(),
    EMAILER_SECRET: z.string().nonempty().optional(),
    EMAILER_WAITLIST_TAG_ID: z.string().nonempty().optional(),
    EMAILER_WAITLIST_INVITE_TAG_ID: z.string().nonempty().optional(),
    EMAILER_USER_TAG_ID: z.string().nonempty().optional(),
    MONGO_URI: z.string().nonempty(),
    NODE_ENV: z.nativeEnum(NodeEnv),
    TZ: z.enum(["Etc/UTC", "UTC"]),
    ORIGINS_ALLOWED: z.array(z.string().nonempty()).default([]),
    PORT: z.string().nonempty().default(PORT_DEFAULT_BACKEND.toString()),
    SUPERTOKENS_URI: z.string().nonempty(),
    SUPERTOKENS_KEY: z.string().nonempty(),
    TOKEN_GCAL_NOTIFICATION: z.string().nonempty(),
    TOKEN_COMPASS_SYNC: z.string().nonempty(),
    NGROK_AUTHTOKEN: z.string().nonempty().optional(),
    NGROK_DOMAIN: z.string().nonempty().optional(),
  })
  .strict()
  .superRefine(({ NGROK_AUTHTOKEN, NGROK_DOMAIN }, context) => {
    if (!NGROK_AUTHTOKEN) return;
    if (NGROK_AUTHTOKEN && NGROK_DOMAIN) return;

    return context.addIssue({
      code: z.ZodIssueCode.invalid_string,
      fatal: true,
      validation: "url",
      message: "you need to supply a static ngrok domain",
      path: ["NGROK_DOMAIN"],
    });
  });

const processEnv = {
  BASEURL: process.env["BASEURL"],
  CHANNEL_EXPIRATION_MIN: process.env["CHANNEL_EXPIRATION_MIN"],
  CLIENT_ID: process.env["CLIENT_ID"],
  CLIENT_SECRET: process.env["CLIENT_SECRET"],
  DB: IS_DEV ? "dev_calendar" : "prod_calendar",
  EMAILER_SECRET: process.env["EMAILER_API_SECRET"],
  EMAILER_WAITLIST_TAG_ID: process.env["EMAILER_WAITLIST_TAG_ID"],
  EMAILER_WAITLIST_INVITE_TAG_ID: process.env["EMAILER_WAITLIST_INVITE_TAG_ID"],
  EMAILER_USER_TAG_ID: process.env["EMAILER_USER_TAG_ID"],
  MONGO_URI: process.env["MONGO_URI"],
  NODE_ENV: _nodeEnv,
  TZ: process.env.TZ,
  ORIGINS_ALLOWED: process.env["CORS"] ? process.env["CORS"].split(",") : [],
  PORT: process.env["PORT"],
  SUPERTOKENS_URI: process.env["SUPERTOKENS_URI"],
  SUPERTOKENS_KEY: process.env["SUPERTOKENS_KEY"],
  TOKEN_GCAL_NOTIFICATION: process.env["TOKEN_GCAL_NOTIFICATION"],
  TOKEN_COMPASS_SYNC: process.env["TOKEN_COMPASS_SYNC"],
  NGROK_AUTHTOKEN: process.env["NGROK_AUTHTOKEN"],
  NGROK_DOMAIN: process.env["NGROK_DOMAIN"],
};

const { success, error, data } = EnvSchema.safeParse(processEnv);

if (!success) {
  logger.error(`Exiting because a critical env value is missing or invalid:`);
  console.error(error.issues);
  process.exit(1);
}

export const ENV = data!;
