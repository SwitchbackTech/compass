import { type PreloadedState } from "@reduxjs/toolkit";
import { useUserMetadataStore } from "@web/auth/state/user-metadata.store";
import {
  type State_DraftEvent,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { useViewStore } from "@web/events/stores/view.store";
import { useSettingsStore } from "@web/settings/settings.store";
import { type RootState } from "@web/store";

type SettingsState = ReturnType<typeof useSettingsStore.getState>;
type UserMetadataState = ReturnType<typeof useUserMetadataStore.getState>;
type ViewState = ReturnType<typeof useViewStore.getState>;

/**
 * State shape accepted by the render helpers' `state` option. All domains
 * now live in Zustand stores; the shape mirrors the old Redux RootState
 * (draft nested under `events`) so existing tests keep working.
 */
export type TestAppState = PreloadedState<RootState> & {
  events?: { draft?: Partial<State_DraftEvent> };
  settings?: Partial<SettingsState>;
  userMetadata?: Partial<UserMetadataState>;
  view?: Partial<ViewState>;
};

/**
 * Seed the Zustand stores from the test state and return the remainder for
 * Redux's preloadedState (empty once all domains migrated).
 */
export function seedStoresFromState(
  state?: TestAppState,
): PreloadedState<RootState> | undefined {
  if (!state) return state;

  const { events, settings, userMetadata, view, ...remaining } = state;
  if (events?.draft) useDraftStore.setState(events.draft);
  if (settings) useSettingsStore.setState(settings);
  if (userMetadata) useUserMetadataStore.setState(userMetadata);
  if (view) useViewStore.setState(view);
  return remaining;
}
