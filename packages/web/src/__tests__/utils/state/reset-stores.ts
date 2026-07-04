/**
 * Zustand stores are module-level singletons, so test isolation comes from
 * resetting them between tests instead of building a fresh store per render.
 * Every store migrated off Redux registers a reset here; web.preload.ts calls
 * resetAllStores() in a global afterEach so individual test files never need
 * to remember it.
 */
import {
  initialSettingsState,
  useSettingsStore,
} from "@web/settings/settings.store";

type StoreReset = () => void;

const storeResets: StoreReset[] = [
  // Populated as slices migrate to Zustand:
  // settings, view, auth, userMetadata, draft
  () => useSettingsStore.setState(initialSettingsState, true),
];

export function resetAllStores() {
  for (const reset of storeResets) {
    reset();
  }
}
