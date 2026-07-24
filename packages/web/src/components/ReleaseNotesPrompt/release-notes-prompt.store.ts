import { create } from "zustand";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";

export interface ReleaseNotesPromptState {
  isOpen: boolean;
}

export const useReleaseNotesPromptStore = create<ReleaseNotesPromptState>()(
  () => ({ isOpen: false }),
);

const SCHEDULED_OPEN_AT_KEY =
  "compass.onboarding.release-notes-prompt-scheduled-at";

let timeoutId: number | undefined;

const clearTimer = () => {
  if (timeoutId !== undefined) {
    window.clearTimeout(timeoutId);
    timeoutId = undefined;
  }
};

const clearSchedule = () => {
  clearTimer();
  persistentBrowserStore.remove(SCHEDULED_OPEN_AT_KEY);
};

const openPrompt = () => {
  clearSchedule();
  useReleaseNotesPromptStore.setState({ isOpen: true });
};

const startTimer = (delayMs: number) => {
  clearTimer();
  timeoutId = window.setTimeout(() => {
    timeoutId = undefined;
    openPrompt();
  }, delayMs);
};

const resumeScheduledOpen = () => {
  if (!persistentBrowserStore.isAvailable()) return;

  const storedOpenAt = persistentBrowserStore.get(SCHEDULED_OPEN_AT_KEY);
  if (storedOpenAt === null) return;

  const openAtMs = Number(storedOpenAt);
  if (!Number.isFinite(openAtMs)) {
    persistentBrowserStore.remove(SCHEDULED_OPEN_AT_KEY);
    return;
  }

  const remainingMs = openAtMs - Date.now();
  if (remainingMs <= 0) {
    openPrompt();
    return;
  }

  startTimer(remainingMs);
};

export const releaseNotesPromptActions = {
  open: openPrompt,
  close: () => {
    clearSchedule();
    useReleaseNotesPromptStore.setState({ isOpen: false });
  },
  scheduleOpen: (delayMs = 45_000) => {
    if (persistentBrowserStore.isAvailable()) {
      persistentBrowserStore.set(
        SCHEDULED_OPEN_AT_KEY,
        String(Date.now() + delayMs),
      );
    }
    startTimer(delayMs);
  },
};

export const selectReleaseNotesPromptOpen = (state: ReleaseNotesPromptState) =>
  state.isOpen;

// E2e bridge: raise the post-signup prompt without a real signup. Merge so
// sibling store bridges survive.
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
