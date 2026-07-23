import { create } from "zustand";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";

export interface ReleaseNotesPromptState {
  isOpen: boolean;
}

export const useReleaseNotesPromptStore = create<ReleaseNotesPromptState>()(
  () => ({ isOpen: false }),
);

const SCHEDULED_OPEN_AT_STORAGE_KEY =
  "compass.onboarding.release-notes-prompt-scheduled-at";

let scheduleOpenTimeoutId: number | undefined;

const clearScheduledOpenStorage = () => {
  persistentBrowserStore.remove(SCHEDULED_OPEN_AT_STORAGE_KEY);
};

const clearScheduledOpen = () => {
  if (scheduleOpenTimeoutId !== undefined) {
    window.clearTimeout(scheduleOpenTimeoutId);
    scheduleOpenTimeoutId = undefined;
  }
};

const openPrompt = () => {
  clearScheduledOpen();
  clearScheduledOpenStorage();
  useReleaseNotesPromptStore.setState({ isOpen: true });
};

const startScheduledOpenTimer = (delayMs: number) => {
  clearScheduledOpen();
  scheduleOpenTimeoutId = window.setTimeout(() => {
    scheduleOpenTimeoutId = undefined;
    openPrompt();
  }, delayMs);
};

const resumeScheduledOpen = () => {
  if (!persistentBrowserStore.isAvailable()) {
    return;
  }

  const storedOpenAt = persistentBrowserStore.get(
    SCHEDULED_OPEN_AT_STORAGE_KEY,
  );
  if (storedOpenAt === null) {
    return;
  }

  const openAtMs = Number(storedOpenAt);
  if (!Number.isFinite(openAtMs)) {
    clearScheduledOpenStorage();
    return;
  }

  const remainingMs = openAtMs - Date.now();
  if (remainingMs <= 0) {
    openPrompt();
    return;
  }

  startScheduledOpenTimer(remainingMs);
};

export const releaseNotesPromptActions = {
  open: () => {
    openPrompt();
  },
  close: () => {
    clearScheduledOpen();
    clearScheduledOpenStorage();
    useReleaseNotesPromptStore.setState({ isOpen: false });
  },
  scheduleOpen: (delayMs = 45_000) => {
    if (persistentBrowserStore.isAvailable()) {
      persistentBrowserStore.set(
        SCHEDULED_OPEN_AT_STORAGE_KEY,
        String(Date.now() + delayMs),
      );
    }
    startScheduledOpenTimer(delayMs);
  },
};

export const selectReleaseNotesPromptOpen = (state: ReleaseNotesPromptState) =>
  state.isOpen;

// Semantic bridge for e2e tests, mirroring the user-metadata store. Lets tests
// raise the post-signup prompt without completing a real (backend-dependent)
// signup. Merge (don't overwrite) so sibling stores' bridges survive.
if (typeof window !== "undefined") {
  resumeScheduledOpen();

  window.__COMPASS_E2E_STORE__ = {
    ...window.__COMPASS_E2E_STORE__,
    releaseNotesPrompt: {
      getState: useReleaseNotesPromptStore.getState,
      open: releaseNotesPromptActions.open,
      close: releaseNotesPromptActions.close,
    },
  };
}
