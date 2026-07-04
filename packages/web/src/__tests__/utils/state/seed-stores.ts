import {
  type UserMetadataState,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import {
  type State_DraftEvent,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { useViewStore } from "@web/events/stores/view.store";
import { useSettingsStore } from "@web/settings/settings.store";

type SettingsState = ReturnType<typeof useSettingsStore.getState>;
type ViewState = ReturnType<typeof useViewStore.getState>;

/**
 * State shape accepted by the render helpers' `state` option. The shape
 * mirrors the historical Redux RootState (draft nested under `events`) so
 * long-lived tests keep working against the Zustand stores.
 */
export type TestAppState = {
  events?: { draft?: Partial<State_DraftEvent> };
  settings?: Partial<SettingsState>;
  userMetadata?: Partial<UserMetadataState>;
  view?: Partial<ViewState>;
};

/** Seed the Zustand stores from the test state. */
export function seedStoresFromState(state?: TestAppState): void {
  if (!state) return;

  const { events, settings, userMetadata, view } = state;
  if (events?.draft) useDraftStore.setState(events.draft);
  if (settings) useSettingsStore.setState(settings);
  if (userMetadata) useUserMetadataStore.setState(userMetadata);
  if (view) useViewStore.setState(view);
}
