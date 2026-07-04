import { type PreloadedState } from "@reduxjs/toolkit";
import { useUserMetadataStore } from "@web/auth/state/user-metadata.store";
import { useViewStore } from "@web/events/stores/view.store";
import { useSettingsStore } from "@web/settings/settings.store";
import { type RootState } from "@web/store";

type SettingsState = ReturnType<typeof useSettingsStore.getState>;
type UserMetadataState = ReturnType<typeof useUserMetadataStore.getState>;
type ViewState = ReturnType<typeof useViewStore.getState>;

/**
 * Transitional shape for the render helpers' `state` option. While slices
 * migrate from Redux to Zustand this stays a superset of both: migrated
 * domains are seeded into their Zustand store and stripped before the rest
 * is handed to Redux as preloadedState.
 */
export type TestAppState = PreloadedState<RootState> & {
  settings?: Partial<SettingsState>;
  userMetadata?: Partial<UserMetadataState>;
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

  const { settings, userMetadata, view, ...remaining } = state;
  if (settings) useSettingsStore.setState(settings);
  if (userMetadata) useUserMetadataStore.setState(userMetadata);
  if (view) useViewStore.setState(view);
  return remaining;
}
