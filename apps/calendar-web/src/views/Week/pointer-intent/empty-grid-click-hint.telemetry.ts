import { track } from "@web/auth/posthog/track";
import { viewFromPathname } from "@web/shortcuts/tips/shortcut-telemetry";
import { type PointerIntent } from "@web/views/Week/pointer-intent/pointer-intent";

const EMPTY_GRID_HINT_THROTTLE_MS = 30_000;

let lastEmptyGridHintTrackedAt = 0;

/** Throttled product signal for intentional empty-grid teaching clicks. */
export function trackEmptyGridClickHintShown(intent: PointerIntent): void {
  if (intent !== "slot-click" && intent !== "allday-click") return;

  const now = Date.now();
  if (now - lastEmptyGridHintTrackedAt < EMPTY_GRID_HINT_THROTTLE_MS) return;
  lastEmptyGridHintTrackedAt = now;

  track("empty_grid_click_hint_shown", {
    intent,
    view: viewFromPathname(window.location.pathname),
  });
}

export function resetEmptyGridClickHintTelemetryForTests(): void {
  lastEmptyGridHintTrackedAt = 0;
}
