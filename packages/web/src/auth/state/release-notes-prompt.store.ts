import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { IS_DEV } from "@web/common/constants/env.constants";

export interface ReleaseNotesPromptState {
  isOpen: boolean;
}

export const initialReleaseNotesPromptState: ReleaseNotesPromptState = {
  isOpen: false,
};

// In-memory only: the prompt is raised right after a new signup and lives for
// that single session. If the user reloads before answering, they can still
// opt in via the command palette (which is what the "Nah" copy points them to).
export const useReleaseNotesPromptStore = create<ReleaseNotesPromptState>()(
  devtools(() => initialReleaseNotesPromptState, {
    name: "compass/releaseNotesPrompt",
    enabled: IS_DEV,
  }),
);

export const releaseNotesPromptActions = {
  open: () =>
    useReleaseNotesPromptStore.setState({ isOpen: true }, false, {
      type: "open",
    }),
  close: () =>
    useReleaseNotesPromptStore.setState({ isOpen: false }, false, {
      type: "close",
    }),
};

export const selectReleaseNotesPromptOpen = (state: ReleaseNotesPromptState) =>
  state.isOpen;

// Semantic bridge for e2e tests (see e2e/utils/compass-window.ts), mirroring
// the user-metadata store. Lets tests raise the post-signup prompt without a
// live backend. Merge (don't overwrite) so sibling stores' bridges survive.
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
