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

export const providerOAuthSignupAnalytics = {
  captureCallbackReceived(input: {
    provider: ProviderKind;
    state: string | null | undefined;
  }): void {
    void captureSafely(getBackendPostHogClient(), {
      event: OAUTH_CALLBACK_RECEIVED_EVENT,
      distinctId: distinctIdFromOAuthState(input.state),
      properties: {
        environment: CONFIG.NODE_ENV,
        provider: input.provider,
      },
    });
  },

  captureFailed(input: {
    provider: ProviderKind;
    state: string | null | undefined;
    reason: OAuthFailedReason;
    providerError?: string;
  }): void {
    void captureSafely(getBackendPostHogClient(), {
      event: OAUTH_FAILED_EVENT,
      distinctId: distinctIdFromOAuthState(input.state),
      properties: {
        environment: CONFIG.NODE_ENV,
        provider: input.provider,
        reason: input.reason,
        ...(input.providerError ? { provider_error: input.providerError } : {}),
      },
    });
  },
};
