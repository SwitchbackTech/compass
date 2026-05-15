import { type Config } from "./config.constants";

export const isGoogleClientIdValid = (clientId?: string): boolean =>
  Boolean(clientId && clientId !== "undefined");

export const isGoogleClientSecretValid = (clientSecret?: string): boolean =>
  Boolean(clientSecret && clientSecret !== "undefined");

export const isGoogleConfigured = (
  env: Pick<Config, "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET">,
): boolean =>
  isGoogleClientIdValid(env.GOOGLE_CLIENT_ID) &&
  isGoogleClientSecretValid(env.GOOGLE_CLIENT_SECRET);
