import {
  SELF_HOST_GOOGLE_CLIENT_ID_PLACEHOLDER,
  SELF_HOST_GOOGLE_CLIENT_SECRET_PLACEHOLDER,
} from "@core/constants/core.constants";
import { type Config } from "./config.constants";

export const isGoogleClientIdValid = (clientId?: string): boolean =>
  Boolean(
    clientId &&
      clientId !== "undefined" &&
      clientId !== SELF_HOST_GOOGLE_CLIENT_ID_PLACEHOLDER,
  );

export const isGoogleConfigured = (
  env: Pick<Config, "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET">,
): boolean =>
  isGoogleClientIdValid(env.GOOGLE_CLIENT_ID) &&
  isGoogleClientSecretValid(env.GOOGLE_CLIENT_SECRET);

export const isGoogleClientSecretValid = (clientSecret?: string): boolean =>
  Boolean(
    clientSecret &&
      clientSecret !== "undefined" &&
      clientSecret !== SELF_HOST_GOOGLE_CLIENT_SECRET_PLACEHOLDER,
  );
