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
  | "shortcut_showcase_assist_used"
  | "first_event_prompt_shown"
  | "first_event_prompt_completed"
  | "first_event_prompt_dismissed"
  | "trial_started"
  | "trial_converted"
  | "trial_expired"
  | "trial_gate_shown"
  | "trial_gate_cta_clicked"
  | "billing_gate_shown"
  | "billing_gate_cta_clicked"
  | "shortcut_tip_shown"
  | "shortcut_tip_acted_on"
  | "notifications_enabled"
  | "notifications_disabled"
  | "notifications_enable_denied";

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
