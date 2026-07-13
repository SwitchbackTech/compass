import { create } from "zustand";

interface ReleaseNotesPromptState {
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
