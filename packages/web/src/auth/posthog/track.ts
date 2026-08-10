import { getPosthogClient } from "@web/auth/posthog/posthog.bootstrap";

export type ProductEvent =
  | "welcome_modal_shown"
  | "welcome_modal_dismissed"
  | "signup_started"
  | "signup_completed"
  | "login_completed"
  | "event_created"
  | "calendar_connected"
  | "onboarding_game_started"
  | "onboarding_task_completed"
  | "onboarding_segment_reached"
  | "onboarding_game_skipped"
  | "onboarding_game_finished"
  | "onboarding_game_replayed"
  | "connect_cta_shown"
  | "connect_cta_accepted"
  | "connect_cta_skipped"
  | "trial_cta_shown"
  | "trial_started"
  | "trial_converted"
  | "trial_expired"
  | "shortcut_tip_shown"
  | "shortcut_tip_acted_on";

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
