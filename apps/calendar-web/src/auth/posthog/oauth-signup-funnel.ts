import { type OAuthFailedReason } from "@core/analytics/oauth-signup.events";
import { type ProviderKind } from "@core/types/sync/identity.contracts";
import {
  type SignupFailureReason,
  type SignupStep,
  trackSignupFailed,
} from "@web/auth/posthog/signup-funnel";
import { track } from "@web/auth/posthog/track";

const SIGNUP_FAILURE_TO_OAUTH_FAILED: Partial<
  Record<SignupFailureReason, OAuthFailedReason>
> = {
  oauth_user_cancelled: "access_denied",
  oauth_missing_state: "invalid_state",
  oauth_missing_intent: "invalid_state",
  oauth_missing_code: "missing_code",
  oauth_exchange_failed: "token_exchange_error",
  oauth_missing_scopes: "other",
  oauth_callback_crashed: "other",
};

export function oauthFailedReasonFromSignupFailure(
  reason: SignupFailureReason,
): OAuthFailedReason {
  return SIGNUP_FAILURE_TO_OAUTH_FAILED[reason] ?? "other";
}

export function trackOAuthSignupFailed(input: {
  provider: ProviderKind;
  reason: SignupFailureReason;
  providerError?: string;
  step?: SignupStep;
  error?: string;
}): void {
  track("oauth_failed", {
    provider: input.provider,
    reason: oauthFailedReasonFromSignupFailure(input.reason),
    ...(input.providerError ? { provider_error: input.providerError } : {}),
  });
  trackSignupFailed(input.reason, {
    method: input.provider,
    step: input.step,
    error: input.error,
  });
}
