import {
  type OAuthFailedReason,
  oauthFailedReasonFromCallbackQuery,
} from "@core/analytics/oauth-signup.events";

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
  stateVerifyReason?:
    | "malformed"
    | "invalidSignature"
    | "expired"
    | "stateMismatch"
    | undefined;
  exchangeError?: unknown;
}): { reason: OAuthFailedReason; provider_error?: string } | undefined {
  if (input.outcome === "connected") return undefined;

  const providerErrorRaw =
    typeof input.oauthError === "string" ? input.oauthError : undefined;
  const providerError = sanitizeOAuthProviderError(providerErrorRaw);
  const providerDescription = sanitizeOAuthProviderError(
    typeof input.oauthErrorDescription === "string"
      ? input.oauthErrorDescription
      : undefined,
  );

  if (input.outcome === "declined") {
    const reason =
      oauthFailedReasonFromCallbackQuery({
        state: typeof input.state === "string" ? input.state : null,
        code: typeof input.code === "string" ? input.code : null,
        providerError: providerErrorRaw ?? null,
      }) ?? "other";
    return {
      reason,
      ...(providerError ? { provider_error: providerError } : {}),
    };
  }

  if (input.outcome === "stateMismatch") {
    return { reason: "invalid_state" };
  }

  if (input.outcome === "error") {
    const hasState = typeof input.state === "string" && input.state.length > 0;
    const hasCode = typeof input.code === "string" && input.code.length > 0;

    if (!hasState || input.stateVerifyReason === "malformed") {
      return {
        reason: "invalid_state",
        ...(providerError ? { provider_error: providerError } : {}),
      };
    }
    if (!hasCode) {
      return {
        reason: "missing_code",
        ...(providerError ? { provider_error: providerError } : {}),
      };
    }
    if (
      input.stateVerifyReason === "invalidSignature" ||
      input.stateVerifyReason === "expired"
    ) {
      return { reason: "invalid_state" };
    }
    if (isTokenExchangeFailure(input.exchangeError)) {
      return {
        reason: "token_exchange_error",
        provider_error: providerErrorFromExchange(input.exchangeError),
      };
    }
    return {
      reason: "other",
      ...((providerError ?? providerDescription)
        ? {
            provider_error: providerError ?? providerDescription,
          }
        : {}),
    };
  }

  return {
    reason: "other",
    ...((providerError ?? providerDescription)
      ? { provider_error: providerError ?? providerDescription }
      : {}),
  };
}

function isTokenExchangeFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = (error as { name?: unknown }).name;
  return name === "ProviderAuthError";
}

function providerErrorFromExchange(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const reason = (error as { reason?: unknown }).reason;
  if (typeof reason === "string" && reason.length > 0) {
    return sanitizeOAuthProviderError(reason);
  }
  return undefined;
}
