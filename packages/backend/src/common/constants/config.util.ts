import { type ProviderKind } from "@core/types/sync/identity.contracts";
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

const isConfiguredValue = (value?: string): boolean =>
  Boolean(value && value !== "undefined");

export const isMicrosoftConfigured = (
  env: Pick<Config, "MICROSOFT_CLIENT_ID" | "MICROSOFT_CLIENT_SECRET">,
): boolean =>
  isConfiguredValue(env.MICROSOFT_CLIENT_ID) &&
  isConfiguredValue(env.MICROSOFT_CLIENT_SECRET);

export const isAppleSignInConfigured = (
  env: Pick<
    Config,
    | "APPLE_SIGNIN_SERVICES_ID"
    | "APPLE_SIGNIN_TEAM_ID"
    | "APPLE_SIGNIN_KEY_ID"
    | "APPLE_SIGNIN_PRIVATE_KEY"
  >,
): boolean =>
  isConfiguredValue(env.APPLE_SIGNIN_SERVICES_ID) &&
  isConfiguredValue(env.APPLE_SIGNIN_TEAM_ID) &&
  isConfiguredValue(env.APPLE_SIGNIN_KEY_ID) &&
  isConfiguredValue(env.APPLE_SIGNIN_PRIVATE_KEY);

export const isAppleConnectConfigured = (
  env: Pick<Config, "SYNC_CREDENTIAL_ENCRYPTION_KEY">,
): boolean => isConfiguredValue(env.SYNC_CREDENTIAL_ENCRYPTION_KEY);

export const isOAuthConnectConfigured = (
  env: Pick<
    Config,
    | "GOOGLE_CLIENT_ID"
    | "GOOGLE_CLIENT_SECRET"
    | "MICROSOFT_CLIENT_ID"
    | "MICROSOFT_CLIENT_SECRET"
  >,
  provider: ProviderKind,
): boolean => {
  switch (provider) {
    case "google":
      return isGoogleConfigured(env);
    case "microsoft":
      return isMicrosoftConfigured(env);
    case "apple":
      return false;
  }
};

const isStripeValueValid = (value?: string): boolean =>
  Boolean(value && value !== "undefined");

export const isStripeConfigured = (
  env: Pick<
    Config,
    | "STRIPE_SECRET_KEY"
    | "STRIPE_WEBHOOK_SECRET"
    | "STRIPE_PRICE_ID"
    | "STRIPE_PUBLISHABLE_KEY"
  >,
): boolean =>
  isStripeValueValid(env.STRIPE_SECRET_KEY) &&
  isStripeValueValid(env.STRIPE_WEBHOOK_SECRET) &&
  isStripeValueValid(env.STRIPE_PRICE_ID) &&
  isStripeValueValid(env.STRIPE_PUBLISHABLE_KEY);

export const isBillingEnforced = (
  env: Pick<Config, "BILLING_ENFORCEMENT">,
): boolean => env.BILLING_ENFORCEMENT;

/**
 * Whether this account is exempt from billing gates. Operator-set allowlist,
 * for accounts that cannot complete a real Stripe Checkout (e.g. staging test
 * accounts). Both sides are trimmed and lowercased so a stray space or
 * capitalized address in a deploy variable still matches.
 */
export const isBillingBypassed = (
  env: Pick<Config, "BILLING_BYPASS_EMAILS">,
  email: string | undefined,
): boolean => {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;

  return env.BILLING_BYPASS_EMAILS.some(
    (allowed) => allowed.trim().toLowerCase() === normalized,
  );
};
