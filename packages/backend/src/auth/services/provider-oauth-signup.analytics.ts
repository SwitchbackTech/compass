import {
  type AuthOAuthCallbackOutcome,
  type AuthOAuthFlow,
  authOAuthCallbackOutcomeFromQuery,
  OAUTH_CALLBACK_EVENT,
  type OAuthFailedReason,
} from "@core/analytics/oauth-signup.events";
import {
  posthogDistinctIdFromSignInOAuthState,
  signInOAuthFlowFromState,
} from "@core/auth/signin-oauth-state.util";
import { captureSafely } from "@core/logger/posthog-capture";
import { type ProviderKind } from "@core/types/sync/identity.contracts";
import { CONFIG } from "@backend/common/constants/config.constants";
import { getBackendPostHogClient } from "@backend/common/helpers/backend-posthog-client";

const FALLBACK_DISTINCT_ID = "compass-oauth-signup";

function distinctIdFromOAuthState(state: string | null | undefined): string {
  return posthogDistinctIdFromSignInOAuthState(state) ?? FALLBACK_DISTINCT_ID;
}

async function captureAuthOAuthCallback(input: {
  provider: ProviderKind;
  state: string | null | undefined;
  flow?: AuthOAuthFlow;
  outcome: AuthOAuthCallbackOutcome;
  reason?: OAuthFailedReason;
}): Promise<boolean> {
  return captureSafely(getBackendPostHogClient(), {
    event: OAUTH_CALLBACK_EVENT,
    distinctId: distinctIdFromOAuthState(input.state),
    properties: {
      environment: CONFIG.NODE_ENV,
      provider: input.provider,
      flow: input.flow ?? signInOAuthFlowFromState(input.state),
      outcome: input.outcome,
      ...(input.reason ? { reason: input.reason } : {}),
    },
  });
}

export const providerOAuthSignupAnalytics = {
  async captureCallbackQuery(input: {
    provider: ProviderKind;
    state: string | null | undefined;
    code: string | null | undefined;
    providerError: string | null | undefined;
  }): Promise<boolean> {
    const { outcome, reason } = authOAuthCallbackOutcomeFromQuery({
      state: input.state,
      code: input.code,
      providerError: input.providerError,
    });
    return captureAuthOAuthCallback({
      provider: input.provider,
      state: input.state,
      outcome,
      reason,
    });
  },

  async captureExchangeFailure(input: {
    provider: ProviderKind;
    state: string | null | undefined;
    reason: Extract<
      OAuthFailedReason,
      "token_exchange_failed" | "user_create_failed" | "other"
    >;
  }): Promise<boolean> {
    return captureAuthOAuthCallback({
      provider: input.provider,
      state: input.state,
      outcome: "failure",
      reason: input.reason,
    });
  },
};
