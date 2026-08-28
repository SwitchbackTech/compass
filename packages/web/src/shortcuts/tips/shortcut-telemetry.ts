import { track } from "@web/auth/posthog/track";
import {
  readShortcutUsageProfile,
  type ShortcutActionUsage,
  type ShortcutUsageProfile,
  writeShortcutUsageProfile,
} from "@web/shortcuts/tips/shortcut-personalization.storage";
import {
  getShortcutHint,
  type RankedShortcutHint,
  type ShortcutHintId,
} from "@web/shortcuts/tips/shortcut-tips.data";

const IMPRESSION_WINDOW_MS = 24 * 60 * 60 * 1000;
const PRESENTATION_DEDUPE_MS = 30 * 1000;

type ActiveSuggestion = Pick<
  RankedShortcutHint,
  "actionId" | "featureArea" | "id" | "reasonCode"
>;

let activeSuggestion: ActiveSuggestion | null = null;
const lastPresentationByKey = new Map<string, number>();

const suggestionProperties = (suggestion: ActiveSuggestion) => ({
  action_id: suggestion.actionId,
  feature_area: suggestion.featureArea,
  rank: 1,
  reason_code: suggestion.reasonCode,
  source: "sidebar_status",
});

const emptyUsage = (): ShortcutActionUsage => ({
  invocations: 0,
  recentImpressions: 0,
});

function updateUsage(
  actionId: RankedShortcutHint["actionId"],
  update: (current: ShortcutActionUsage) => ShortcutActionUsage,
): void {
  const current = readShortcutUsageProfile();
  const next: ShortcutUsageProfile = {
    version: 1,
    actions: {
      ...current.actions,
      [actionId]: update(current.actions[actionId] ?? emptyUsage()),
    },
  };
  writeShortcutUsageProfile(next);
}

/**
 * Starts one visible sidebar-tip presentation. React remounts and short-lived
 * operational statuses can reveal the same tip repeatedly, so identical
 * presentations are locally deduplicated for 30 seconds.
 */
export function beginShortcutSuggestionPresentation(
  suggestion: ActiveSuggestion,
  now = Date.now(),
): () => void {
  activeSuggestion = suggestion;

  const dedupeKey = `${suggestion.id}:${suggestion.reasonCode}`;
  const lastPresentation = lastPresentationByKey.get(dedupeKey);
  if (
    lastPresentation === undefined ||
    now - lastPresentation >= PRESENTATION_DEDUPE_MS
  ) {
    lastPresentationByKey.set(dedupeKey, now);
    updateUsage(suggestion.actionId, (current) => {
      const isRecent =
        current.lastShownAt !== undefined &&
        now - current.lastShownAt < IMPRESSION_WINDOW_MS;
      return {
        ...current,
        lastShownAt: now,
        recentImpressions: isRecent ? current.recentImpressions + 1 : 1,
      };
    });
    track("shortcut_suggestion_shown", {
      ...suggestionProperties(suggestion),
      outcome: "shown",
    });
  }

  return () => {
    if (activeSuggestion === suggestion) activeSuggestion = null;
  };
}

/** Records a successful taught shortcut outcome. This is deliberately called
 * from the outcome sites, not the raw keydown path. */
export function recordShortcutInvocation(
  hintId: ShortcutHintId,
  now = Date.now(),
): void {
  const hint = getShortcutHint(hintId);
  const engaged = activeSuggestion?.actionId === hint.actionId;
  updateUsage(hint.actionId, (current) => ({
    ...current,
    invocations: current.invocations + 1,
    lastInvokedAt: now,
  }));

  track("shortcut_invoked", {
    action_id: hint.actionId,
    feature_area: hint.featureArea,
    outcome: "succeeded",
    reason_code: "registered_shortcut",
    source: "keyboard",
  });

  if (engaged && activeSuggestion) {
    track("shortcut_suggestion_engaged", {
      ...suggestionProperties(activeSuggestion),
      outcome: "invoked",
    });
  }
}

/** A registered shortcut reached the app handler but an app-level lock owned
 * the keyboard. No typed value, DOM content, or key value is captured. */
export function recordShortcutUnavailableAttempt(
  hintId: ShortcutHintId,
  reasonCode: "app_locked",
): void {
  const hint = getShortcutHint(hintId);
  track("shortcut_unavailable_attempt", {
    action_id: hint.actionId,
    feature_area: hint.featureArea,
    outcome: "unavailable",
    reason_code: reasonCode,
    source: "keyboard",
  });
}

/** Test-only reset for module-level presentation dedupe state. */
export function resetShortcutTelemetryForTests(): void {
  activeSuggestion = null;
  lastPresentationByKey.clear();
}
