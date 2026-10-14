import { type ProviderKind } from "@core/types/sync/identity.contracts";

/** Server- and client-side OAuth signup funnel events (see `track.ts`). */
export const OAUTH_CALLBACK_RECEIVED_EVENT = "oauth_callback_received" as const;
export const OAUTH_FAILED_EVENT = "oauth_failed" as const;

export type OAuthSignupServerEvent =
  | typeof OAUTH_CALLBACK_RECEIVED_EVENT
  | typeof OAUTH_FAILED_EVENT;

export type OAuthFailedReason =
  | "access_denied"
  | "invalid_state"
  | "token_exchange_error"
  | "missing_code"
  | "other";

const OAUTH_FAILED_REASONS: readonly OAuthFailedReason[] = [
  "access_denied",
  "invalid_state",
  "token_exchange_error",
  "missing_code",
  "other",
];

export function isOAuthFailedReason(
  value: unknown,
): value is OAuthFailedReason {
  return (
    typeof value === "string" &&
    (OAUTH_FAILED_REASONS as readonly string[]).includes(value)
  );
}

export type OAuthSignupEventProperties = {
  provider: ProviderKind;
  reason?: OAuthFailedReason;
  /** Raw provider `error` query param when present (e.g. Google OAuth errors). */
  provider_error?: string;
};

export function oauthFailedReasonFromProviderError(
  providerError: string | null | undefined,
): OAuthFailedReason {
  if (providerError === "access_denied") return "access_denied";
  if (providerError) return "other";
  return "other";
}

export function oauthFailedReasonFromCallbackQuery(input: {
  state: string | null | undefined;
  code: string | null | undefined;
  providerError: string | null | undefined;
}): OAuthFailedReason | undefined {
  if (input.providerError === "access_denied") return "access_denied";
  if (input.providerError) return "other";
  if (!input.state) return "invalid_state";
  if (!input.code) return "missing_code";
  return undefined;
}
