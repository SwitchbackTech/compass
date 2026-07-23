import { create } from "zustand";

export interface ReleaseNotesPromptState {
  isOpen: boolean;
}

export const useReleaseNotesPromptStore = create<ReleaseNotesPromptState>()(
  () => ({ isOpen: false }),
);

let scheduleOpenTimeoutId: ReturnType<typeof window.setTimeout> | undefined;

const clearScheduledOpen = () => {
  if (scheduleOpenTimeoutId !== undefined) {
    window.clearTimeout(scheduleOpenTimeoutId);
    scheduleOpenTimeoutId = undefined;
  }
};

export const releaseNotesPromptActions = {
  open: () => {
    clearScheduledOpen();
    useReleaseNotesPromptStore.setState({ isOpen: true });
  },
  close: () => {
    clearScheduledOpen();
    useReleaseNotesPromptStore.setState({ isOpen: false });
  },
  scheduleOpen: (delayMs = 45_000) => {
    clearScheduledOpen();
    scheduleOpenTimeoutId = window.setTimeout(() => {
      scheduleOpenTimeoutId = undefined;
      useReleaseNotesPromptStore.setState({ isOpen: true });
    }, delayMs);
  },
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
