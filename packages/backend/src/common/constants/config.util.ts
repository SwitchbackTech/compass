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

const isStripeValueValid = (value?: string): boolean =>
  Boolean(value && value !== "undefined");

export const isStripeConfigured = (
  env: Pick<
    Config,
    "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SECRET" | "STRIPE_PRICE_ID"
  >,
): boolean =>
  isStripeValueValid(env.STRIPE_SECRET_KEY) &&
  isStripeValueValid(env.STRIPE_WEBHOOK_SECRET) &&
  isStripeValueValid(env.STRIPE_PRICE_ID);

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
