import { OAUTH_CALLBACK_RECEIVED_EVENT } from "@core/analytics/oauth-signup.events";
import { type ProviderKind } from "@core/types/sync/identity.contracts";
import { trackSignupStep } from "@web/auth/posthog/signup-funnel";
import { track } from "@web/auth/posthog/track";
import { relayProviderOAuthCallbackTelemetry } from "@web/auth/providers/authorization/relay-provider-oauth-callback-telemetry";

/**
 * Records that the user returned from the provider before any success or
 * failure branch. Order: server relay, then client funnel + landing events.
 */
export function recordOAuthSignInCallbackLanding(
  provider: ProviderKind,
  search: string,
): void {
  relayProviderOAuthCallbackTelemetry(provider, search);
  trackSignupStep("oauth_callback_returned", { method: provider });
  track(OAUTH_CALLBACK_RECEIVED_EVENT, { provider });
}
