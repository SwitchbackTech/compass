/**
 * Zustand stores are module-level singletons, so test isolation comes from
 * resetting them between tests instead of building a fresh store per render.
 * Every store migrated off Redux registers a reset here; web.preload.ts calls
 * resetAllStores() in a global afterEach so individual test files never need
 * to remember it.
 */
import {
  initialUserMetadataState,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
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

type StoreReset = () => void;

const storeResets: StoreReset[] = [
  () => useSettingsStore.setState(initialSettingsState, true),
  () => useViewStore.setState(initialViewState, true),
  () => useUserMetadataStore.setState(initialUserMetadataState, true),
  () => useDraftStore.setState(initialDraftState, true),
  () => useUndoHistoryStore.setState(initialUndoHistoryState, true),
];

export function resetAllStores() {
  for (const reset of storeResets) {
    reset();
  }
}
