/**
 * Zustand stores (and other module-level singleton stores, e.g. the
 * repository-source cache) persist across test files within a worker, so
 * test isolation comes from resetting them between tests instead of building
 * a fresh store per render.
 */
import { resetBackendAvailabilityForTests } from "@web/api/util/backend-unavailable-error.util";
import {
  initialUserMetadataState,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { resetCalendarVisibilityStoreForTests } from "@web/calendars/calendar-visibility.store";
import { resetCollapsedAccountsStoreForTests } from "@web/calendars/collapsed-accounts.store";
import { resetDefaultCalendarStoreForTests } from "@web/calendars/default-calendar.store";
import { useFeedbackStore } from "@web/components/Feedback/feedback.store";
import { useReleaseNotesPromptStore } from "@web/components/ReleaseNotesPrompt/release-notes-prompt.store";
import { useWelcomeGuideStore } from "@web/components/WelcomeModal/welcome.guide.store";
import { recurrenceScopeOpportunityActions } from "@web/events/recurrence/recurrence-scope-opportunity.store";
import { resetEventRepositorySourceForTests } from "@web/events/repositories/event.repository.source.store";
import {
  initialDraftState,
  useDraftStore,
} from "@web/events/stores/draft.store";
import {
  initialUndoHistoryState,
  useUndoHistoryStore,
} from "@web/events/stores/undo.store";
import { initialViewState, useViewStore } from "@web/events/stores/view.store";
import {
  initialSettingsState,
  useSettingsStore,
} from "@web/settings/settings.store";
import { useThemeStore } from "@web/settings/theme/theme.store";
import { setWeekInteractionMotionActive } from "@web/views/Week/interaction/state/motion.state";

type StoreReset = () => void;

const storeResets: StoreReset[] = [
  () => useSettingsStore.setState(initialSettingsState, true),
  () => useViewStore.setState(initialViewState, true),
  () => useUserMetadataStore.setState(initialUserMetadataState, true),
  () => useDraftStore.setState(initialDraftState, true),
  () => useUndoHistoryStore.setState(initialUndoHistoryState, true),
  recurrenceScopeOpportunityActions.clear,
  // Order matters for this pair: the availability flag must be cleared
  // BEFORE the source store recomputes, or a test that tripped
  // markBackendUnavailable() leaves every later file's repository source
  // stuck on "local" (fetch failures are tolerated by BaseApi, so the
  // poisoning is silent and only surfaces under CI's file ordering).
  resetBackendAvailabilityForTests,
  resetEventRepositorySourceForTests,
  // Storage itself is cleared by resetBrowserState() (test-lifecycle.ts)
  // before this runs; this just resyncs the module-singleton store to match.
  resetCalendarVisibilityStoreForTests,
  resetDefaultCalendarStoreForTests,
  resetCollapsedAccountsStoreForTests,
  // Lives on window.__weekInteractionMotionActive, which survives across
  // test files (the preload reuses one jsdom window). A test that starts a
  // real drag and never completes it would otherwise leave every later
  // file's grid mousedown handlers inert (they early-return while motion
  // is active) - order-dependent, so it only surfaces on some runners.
  () => setWeekInteractionMotionActive(false),
  () => useFeedbackStore.setState(useFeedbackStore.getInitialState(), true),
  () =>
    useReleaseNotesPromptStore.setState(
      useReleaseNotesPromptStore.getInitialState(),
      true,
    ),
  () =>
    useWelcomeGuideStore.setState(useWelcomeGuideStore.getInitialState(), true),
  () => useThemeStore.setState(useThemeStore.getInitialState(), true),
];

export function resetAllStores() {
  for (const reset of storeResets) {
    reset();
  }
}
