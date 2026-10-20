import {
  type OAuthFailedReason,
  oauthFailedReasonFromCallbackQuery,
} from "@core/analytics/oauth-signup.events";
import { type OAuthStateFailure } from "@core/types/sync/connection.contracts";

export type SyncOAuthCallbackOutcome =
  | "connected"
  | "declined"
  | "missingScopes"
  | "stateMismatch"
  | "consentRequired"
  | "accountMismatch"
  | "error";

const OAUTH_PROVIDER_ERROR_MAX = 160;

/** Strip PII-ish noise from provider error strings before PostHog. */
export function sanitizeOAuthProviderError(
  value: string | null | undefined,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  const collapsed = trimmed.replace(/\s+/g, " ");
  const withoutEmails = collapsed.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    "[email]",
  );
  const withoutLongTokens = withoutEmails.replace(
    /[A-Za-z0-9_\-./=]{32,}/g,
    "[redacted]",
  );
  if (withoutLongTokens.length > OAUTH_PROVIDER_ERROR_MAX) {
    return withoutLongTokens.slice(0, OAUTH_PROVIDER_ERROR_MAX);
  }
  return withoutLongTokens;
}

export function oauthCallbackFailureReason(input: {
  outcome: SyncOAuthCallbackOutcome;
  state: unknown;
  code: unknown;
  oauthError: unknown;
  oauthErrorDescription?: unknown;
  stateVerifyReason?: OAuthStateFailure | undefined;
  exchangeError?: unknown;
}): { reason: OAuthFailedReason; provider_error?: string } | undefined {
  if (input.outcome === "connected") return undefined;

  // Callback query values reach here as `unknown` straight off the request, so
  // each one is narrowed once up front rather than at every branch that reads it.
  const state = asNonEmptyString(input.state);
  const code = asNonEmptyString(input.code);
  const providerErrorRaw = asNonEmptyString(input.oauthError);
  const providerError = sanitizeOAuthProviderError(providerErrorRaw);
  const providerDescription = sanitizeOAuthProviderError(
    asNonEmptyString(input.oauthErrorDescription),
  );
  const mergedProviderError = providerError ?? providerDescription;

  if (input.outcome === "declined") {
    const reason =
      oauthFailedReasonFromCallbackQuery({
        state,
        code,
        providerError: providerErrorRaw,
      }) ?? "other";
    return withProviderError(reason, providerError);
  }

  if (input.outcome === "stateMismatch") {
    return { reason: "invalid_state" };
  }

  if (input.outcome === "error") {
    if (!state || input.stateVerifyReason === "malformed") {
      return withProviderError("invalid_state", providerError);
    }
    if (!code) {
      return withProviderError("missing_code", providerError);
    }
    if (
      input.stateVerifyReason === "invalidSignature" ||
      input.stateVerifyReason === "expired"
    ) {
      return { reason: "invalid_state" };
    }
    const exchange = tokenExchangeFailure(input.exchangeError);
    if (exchange) {
      return withProviderError("token_exchange_error", exchange.providerError);
    }
    return withProviderError("other", mergedProviderError);
  }

  return withProviderError("other", mergedProviderError);
}

function withProviderError(
  reason: OAuthFailedReason,
  providerError?: string,
): { reason: OAuthFailedReason; provider_error?: string } {
  return {
    reason,
    ...(providerError ? { provider_error: providerError } : {}),
  };
}

/** Blank query values mean "absent", the same way a missing param does. */
function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * A provider token-exchange failure, matched structurally because core cannot
 * import sync's `ProviderAuthError` without inverting the package dependency.
 * Returns its sanitized reason when it matches, else null.
 */
function tokenExchangeFailure(
  error: unknown,
): { providerError?: string } | null {
  if (!error || typeof error !== "object") return null;
  const { name, reason } = error as { name?: unknown; reason?: unknown };
  if (name !== "ProviderAuthError") return null;
  const providerError = sanitizeOAuthProviderError(asNonEmptyString(reason));
  return { ...(providerError ? { providerError } : {}) };
}
