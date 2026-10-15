/** Server- and client-side OAuth signup funnel events (see `track.ts`). */
export const OAUTH_CALLBACK_RECEIVED_EVENT = "oauth_callback_received" as const;
export const OAUTH_FAILED_EVENT = "oauth_failed" as const;

export type OAuthFailedReason =
  | "access_denied"
  | "invalid_state"
  | "token_exchange_error"
  | "missing_code"
  | "other";

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
