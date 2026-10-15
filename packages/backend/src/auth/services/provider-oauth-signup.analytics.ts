import {
  OAUTH_CALLBACK_RECEIVED_EVENT,
  OAUTH_FAILED_EVENT,
  type OAuthFailedReason,
} from "@core/analytics/oauth-signup.events";
import { posthogDistinctIdFromSignInOAuthState } from "@core/auth/signin-oauth-state.util";
import { captureSafely } from "@core/logger/posthog-capture";
import { type ProviderKind } from "@core/types/sync/identity.contracts";
import { CONFIG } from "@backend/common/constants/config.constants";
import { getBackendPostHogClient } from "@backend/common/helpers/backend-posthog-client";

const FALLBACK_DISTINCT_ID = "compass-oauth-signup";

function distinctIdFromOAuthState(state: string | null | undefined): string {
  return posthogDistinctIdFromSignInOAuthState(state) ?? FALLBACK_DISTINCT_ID;
}

function captureOAuthSignupEvent(
  event: typeof OAUTH_CALLBACK_RECEIVED_EVENT | typeof OAUTH_FAILED_EVENT,
  input: {
    provider: ProviderKind;
    state: string | null | undefined;
    reason?: OAuthFailedReason;
    providerError?: string;
  },
): void {
  void captureSafely(getBackendPostHogClient(), {
    event,
    distinctId: distinctIdFromOAuthState(input.state),
    properties: {
      environment: CONFIG.NODE_ENV,
      provider: input.provider,
      ...(input.reason ? { reason: input.reason } : {}),
      ...(input.providerError ? { provider_error: input.providerError } : {}),
    },
  });
}

export const providerOAuthSignupAnalytics = {
  captureCallbackReceived(input: {
    provider: ProviderKind;
    state: string | null | undefined;
  }): void {
    captureOAuthSignupEvent(OAUTH_CALLBACK_RECEIVED_EVENT, input);
  },

  captureFailed(input: {
    provider: ProviderKind;
    state: string | null | undefined;
    reason: OAuthFailedReason;
    providerError?: string;
  }): void {
    captureOAuthSignupEvent(OAUTH_FAILED_EVENT, input);
  },
};
