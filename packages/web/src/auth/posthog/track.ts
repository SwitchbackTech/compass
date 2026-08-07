import { getPosthogClient } from "@web/auth/posthog/posthog.bootstrap";

export type ProductEvent =
  | "welcome_modal_shown"
  | "welcome_modal_dismissed"
  | "signup_started"
  | "signup_completed"
  | "login_completed"
  | "event_created"
  | "calendar_connected";

/**
 * Fire-and-forget capture for the small set of product-activation events.
 * No-ops when PostHog isn't initialized (disabled, or not yet booted).
 */
export function track(
  event: ProductEvent,
  properties?: Record<string, string>,
): void {
  getPosthogClient()?.capture(event, properties);
}
