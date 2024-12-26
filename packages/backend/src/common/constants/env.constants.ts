import { z } from "zod";
import { NodeEnv, PORT_DEFAULT_BACKEND } from "@core/constants/core.constants";
import { isDev } from "@core/util/env.util";

const _nodeEnv = process.env["NODE_ENV"] as NodeEnv;
if (!Object.values(NodeEnv).includes(_nodeEnv)) {
  throw new Error(`Invalid NODE_ENV value: '${_nodeEnv}'`);
}

const IS_DEV = isDev(_nodeEnv);

const EnvSchema = z
  .object({
    BASEURL: z.string(),
    CHANNEL_EXPIRATION_MIN: z.string().default("10"),
    CLIENT_ID: z.string(),
    CLIENT_SECRET: z.string(),
    DB: z.string(),
    EMAILER_KEY: z.string().optional(),
    EMAILER_SECRET: z.string().optional(),
    EMAILER_LIST_ID: z.string().optional(),
    MONGO_URI: z.string(),
    NODE_ENV: z.nativeEnum(NodeEnv),
    ORIGINS_ALLOWED: z.array(z.string()).default([]),
    PORT: z.string().default(PORT_DEFAULT_BACKEND.toString()),
    SUPERTOKENS_URI: z.string(),
    SUPERTOKENS_KEY: z.string(),
    TOKEN_GCAL_NOTIFICATION: z.string(),
    TOKEN_COMPASS_SYNC: z.string(),
  })
  .strict();

type Env = z.infer<typeof EnvSchema>;

export const ENV = {
  BASEURL: process.env["BASEURL"],
  CHANNEL_EXPIRATION_MIN: process.env["CHANNEL_EXPIRATION_MIN"],
  CLIENT_ID: process.env["CLIENT_ID"],
  CLIENT_SECRET: process.env["CLIENT_SECRET"],
  DB: IS_DEV ? "dev_calendar" : "prod_calendar",
  EMAILER_KEY: process.env["EMAILER_API_KEY"],
  EMAILER_SECRET: process.env["EMAILER_API_SECRET"],
  EMAILER_LIST_ID: process.env["EMAILER_LIST_ID"],
  MONGO_URI: process.env["MONGO_URI"],
  NODE_ENV: _nodeEnv,
  ORIGINS_ALLOWED: process.env["CORS"] ? process.env["CORS"].split(",") : [],
  PORT: process.env["PORT"],
  SUPERTOKENS_URI: process.env["SUPERTOKENS_URI"],
  SUPERTOKENS_KEY: process.env["SUPERTOKENS_KEY"],
  TOKEN_GCAL_NOTIFICATION: process.env["TOKEN_GCAL_NOTIFICATION"],
  TOKEN_COMPASS_SYNC: process.env["TOKEN_COMPASS_SYNC"],
} as Env;

const parsedEnv = EnvSchema.safeParse(ENV);

if (!parsedEnv.success) {
  console.log(parsedEnv.error.issues);
  console.log(
    `Exiting because a critical env value is missing or invalid: ${JSON.stringify(
      parsedEnv.error.format(),
      null,
      2
    )}`
  );
  process.exit(1);
}
