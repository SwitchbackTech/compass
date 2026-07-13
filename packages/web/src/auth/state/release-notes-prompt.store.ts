import { create } from "zustand";

export interface ReleaseNotesPromptState {
  isOpen: boolean;
}

export const useReleaseNotesPromptStore = create<ReleaseNotesPromptState>()(
  () => ({ isOpen: false }),
);

export const releaseNotesPromptActions = {
  open: () => useReleaseNotesPromptStore.setState({ isOpen: true }),
  close: () => useReleaseNotesPromptStore.setState({ isOpen: false }),
};

export const selectReleaseNotesPromptOpen = (state: ReleaseNotesPromptState) =>
  state.isOpen;

// Semantic bridge for e2e tests, mirroring the user-metadata store. Lets tests
// raise the post-signup prompt without completing a real (backend-dependent)
// signup. Merge (don't overwrite) so sibling stores' bridges survive.
if (typeof window !== "undefined") {
  window.__COMPASS_E2E_STORE__ = {
    ...window.__COMPASS_E2E_STORE__,
    releaseNotesPrompt: {
      getState: useReleaseNotesPromptStore.getState,
      open: releaseNotesPromptActions.open,
      close: releaseNotesPromptActions.close,
    },
  };
}
