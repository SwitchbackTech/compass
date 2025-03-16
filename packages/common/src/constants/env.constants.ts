import { z } from "zod";

const IS_DEV = process.env["NODE_ENV"] === "development";

const EnvSchema = z
  .object({
    BASEURL: z.string().nonempty(),
    CHANNEL_EXPIRATION_MIN: z.string().nonempty().default("10"),
    DB: z.string().nonempty(),
    MONGO_URI: z.string().nonempty(),
    TOKEN_GCAL_NOTIFICATION: z.string().nonempty(),
    TOKEN_COMPASS_SYNC: z.string().nonempty(),
  })
  .strict();

type Env = z.infer<typeof EnvSchema>;

export const ENV = {
  BASEURL: process.env["BASEURL"],
  CHANNEL_EXPIRATION_MIN: process.env["CHANNEL_EXPIRATION_MIN"],
  DB: IS_DEV ? "dev_calendar" : "prod_calendar",
  MONGO_URI: process.env["MONGO_URI"],
  NODE_ENV: process.env["NODE_ENV"],
  TOKEN_GCAL_NOTIFICATION: process.env["TOKEN_GCAL_NOTIFICATION"],
  TOKEN_COMPASS_SYNC: process.env["TOKEN_COMPASS_SYNC"],
} as Env;

const parsedEnv = EnvSchema.safeParse(ENV);

if (!parsedEnv.success) {
  console.error(`Exiting because a critical env value is missing or invalid:`);
  console.error(parsedEnv.error.issues);
  process.exit(1);
}
