import {
  captureSafely,
  createPostHogCaptureClient,
  DEFAULT_POSTHOG_HOST,
  type PostHogCaptureClient,
} from "@core/logger/posthog-capture";
import { CONFIG } from "@backend/common/constants/config.constants";

/**
 * Server-side billing events. The web app's `trial_converted` fires only when
 * the browser lands on the Checkout success redirect, so a user who pays and
 * closes the tab is invisible there. These come from the Stripe webhook and
 * are the source of truth for the PostHog billing funnel.
 */
export type BillingServerEvent = "checkout_completed" | "checkout_expired";

// The HTTP client is stateless, so build it per call: CONFIG is read at
// call time and tests can toggle POSTHOG_KEY through mockEnv.
function getClient(): PostHogCaptureClient | null {
  const apiKey = CONFIG.POSTHOG_KEY;
  if (!apiKey) return null;
  return createPostHogCaptureClient({
    apiKey,
    host: CONFIG.POSTHOG_HOST ?? DEFAULT_POSTHOG_HOST,
    lib: "compass-backend",
  });
}

export const billingAnalytics = {
  /**
   * Best-effort capture keyed by the Compass user id, which is the same
   * distinct id the web app passes to `posthog.identify`, so server and
   * browser events land on one person. Never throws.
   */
  capture(input: {
    event: BillingServerEvent;
    userId: string;
    properties?: Record<string, boolean | number | string>;
  }): Promise<boolean> {
    return captureSafely(getClient(), {
      event: input.event,
      distinctId: input.userId,
      properties: {
        environment: CONFIG.NODE_ENV,
        ...input.properties,
      },
    });
  },
};
