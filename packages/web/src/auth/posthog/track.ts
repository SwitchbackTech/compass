import { getPosthogClient } from "@web/auth/posthog/posthog.bootstrap";

export type ProductEvent =
  | "welcome_modal_shown"
  | "welcome_modal_dismissed"
  | "signup_started"
  | "signup_completed"
  | "login_completed"
  | "event_created"
  | "calendar_connected"
  | "shortcut_showcase_started"
  | "shortcut_showcase_step_completed"
  | "shortcut_showcase_skipped"
  | "shortcut_showcase_finished"
  | "first_event_prompt_shown"
  | "first_event_prompt_completed"
  | "first_event_prompt_dismissed"
  | "trial_converted"
  | "billing_gate_shown"
  | "billing_gate_cta_clicked"
  | "notifications_enabled"
  | "notifications_disabled"
  | "notifications_enable_denied"
  | "shortcut_suggestion_shown"
  | "shortcut_invoked"
  | "shortcut_suggestion_engaged"
  | "shortcut_unavailable_attempt";

export type ProductEventProperties = Record<string, boolean | number | string>;

/**
 * Fire-and-forget capture for the small set of product-activation events.
 * No-ops when PostHog isn't initialized (disabled, or not yet booted).
 */
export function track(
  event: ProductEvent,
  properties?: ProductEventProperties,
): void {
  try {
    getPosthogClient()?.capture(event, properties);
  } catch {
    // Analytics must never interrupt the product action it observes. The SDK
    // owns transport retries and unload flushing for successfully queued data.
  }
}
