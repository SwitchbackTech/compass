/**
 * Zustand stores (and other module-level singleton stores, e.g. the
 * repository-source cache) persist across test files within a worker, so
 * test isolation comes from resetting them between tests instead of building
 * a fresh store per render. Every store migrated off Redux, plus any other
 * module-level store that leaks across test files, registers a reset here;
 * web.preload.ts calls resetAllStores() in a global afterEach so individual
 * test files never need to remember it.
 */
import { resetBackendAvailabilityForTests } from "@web/api/util/backend-unavailable-error.util";
import {
  initialUserMetadataState,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
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
import { setWeekInteractionMotionActive } from "@web/views/Week/interaction/state/weekInteractionMotionState";

type StoreReset = () => void;

const storeResets: StoreReset[] = [
  () => useSettingsStore.setState(initialSettingsState, true),
  () => useViewStore.setState(initialViewState, true),
  () => useUserMetadataStore.setState(initialUserMetadataState, true),
  () => useDraftStore.setState(initialDraftState, true),
  () => useUndoHistoryStore.setState(initialUndoHistoryState, true),
  // Order matters for this pair: the availability flag must be cleared
  // BEFORE the source store recomputes, or a test that tripped
  // markBackendUnavailable() leaves every later file's repository source
  // stuck on "local" (fetch failures are tolerated by BaseApi, so the
  // poisoning is silent and only surfaces under CI's file ordering).
  resetBackendAvailabilityForTests,
  resetEventRepositorySourceForTests,
  // Lives on window.__weekInteractionMotionActive, which survives across
  // test files (the preload reuses one jsdom window). A test that starts a
  // real drag and never completes it would otherwise leave every later
  // file's grid mousedown handlers inert (they early-return while motion
  // is active) - order-dependent, so it only surfaces on some runners.
  () => setWeekInteractionMotionActive(false),
];

export function resetAllStores() {
  for (const reset of storeResets) {
    reset();
  }
}
