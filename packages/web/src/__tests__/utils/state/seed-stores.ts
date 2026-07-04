import { type PreloadedState } from "@reduxjs/toolkit";
import { useViewStore } from "@web/events/stores/view.store";
import { useSettingsStore } from "@web/settings/settings.store";
import { type RootState } from "@web/store";

type SettingsState = ReturnType<typeof useSettingsStore.getState>;
type ViewState = ReturnType<typeof useViewStore.getState>;

/**
 * Transitional shape for the render helpers' `state` option. While slices
 * migrate from Redux to Zustand this stays a superset of both: migrated
 * domains are seeded into their Zustand store and stripped before the rest
 * is handed to Redux as preloadedState.
 */
export type TestAppState = PreloadedState<RootState> & {
  settings?: Partial<SettingsState>;
  view?: Partial<ViewState>;
};

/**
 * Seed migrated Zustand stores from the Redux-shaped test state and return
 * the remainder for Redux's preloadedState.
 */
export function seedStoresFromState(
  state?: TestAppState,
): PreloadedState<RootState> | undefined {
  if (!state) return state;

  const { settings, view, ...remaining } = state;
  if (settings) useSettingsStore.setState(settings);
  if (view) useViewStore.setState(view);
  return remaining;
}
