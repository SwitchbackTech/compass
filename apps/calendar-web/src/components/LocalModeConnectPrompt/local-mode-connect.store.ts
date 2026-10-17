import { create } from "zustand";
import {
  ANONYMOUS_CALENDAR_WRITE_NUDGE_COUNT,
  readAnonymousCalendarWriteCount,
} from "@web/auth/posthog/anon-calendar-write-count.util";
import { trackSignupStartedAtClick } from "@web/auth/posthog/signup-funnel";
import { track } from "@web/auth/posthog/track";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";

export type LocalModeConnectPromptState = {
  writeCount: number;
  isDismissed: boolean;
};

const isDismissedInStorage = (): boolean =>
  !persistentBrowserStore.isAvailable() ||
  persistentBrowserStore.get(
    STORAGE_KEYS.HAS_DISMISSED_LOCAL_MODE_CONNECT_PROMPT,
  ) === "true";

const snapshotFromStorage = (): LocalModeConnectPromptState => ({
  writeCount: readAnonymousCalendarWriteCount(),
  isDismissed: isDismissedInStorage(),
});

export const useLocalModeConnectPromptStore =
  create<LocalModeConnectPromptState>(() => snapshotFromStorage());

let hasTrackedShown = false;

export const localModeConnectPromptActions = {
  syncFromStorage: () => {
    useLocalModeConnectPromptStore.setState(snapshotFromStorage());
  },
  markShown: (eventsCreatedCount: number) => {
    if (hasTrackedShown) return;
    hasTrackedShown = true;
    track("connect_prompt_shown", {
      events_created_count: eventsCreatedCount,
      provider: "google",
    });
  },
  connect: (eventsCreatedCount: number) => {
    track("connect_prompt_clicked", {
      events_created_count: eventsCreatedCount,
      provider: "google",
    });
    void trackSignupStartedAtClick("local_mode_connect_prompt");
  },
  dismiss: (eventsCreatedCount: number) => {
    track("connect_prompt_dismissed", {
      events_created_count: eventsCreatedCount,
      provider: "google",
    });
    persistentBrowserStore.set(
      STORAGE_KEYS.HAS_DISMISSED_LOCAL_MODE_CONNECT_PROMPT,
      "true",
    );
    useLocalModeConnectPromptStore.setState({ isDismissed: true });
  },
};

export const resetLocalModeConnectPromptStoreForTests = (): void => {
  hasTrackedShown = false;
  useLocalModeConnectPromptStore.setState(snapshotFromStorage(), true);
};

export const selectLocalModeConnectPromptWriteCount = (
  state: LocalModeConnectPromptState,
): number => state.writeCount;

export const selectLocalModeConnectPromptDismissed = (
  state: LocalModeConnectPromptState,
): boolean => state.isDismissed;

export type LocalModeConnectPromptEligibility = {
  authenticated: boolean;
  hasUserEverAuthenticated: boolean;
  writeCount: number;
  isDismissed: boolean;
  storageAvailable: boolean;
  isAuthModalOpen: boolean;
  isShowcaseActive: boolean;
  isWelcomeBlocking: boolean;
  googleSignInAvailable: boolean;
};

export const selectLocalModeConnectPromptEligible = (
  input: LocalModeConnectPromptEligibility,
): boolean =>
  !input.authenticated &&
  !input.hasUserEverAuthenticated &&
  input.storageAvailable &&
  !input.isDismissed &&
  input.writeCount >= ANONYMOUS_CALENDAR_WRITE_NUDGE_COUNT &&
  !input.isAuthModalOpen &&
  !input.isShowcaseActive &&
  !input.isWelcomeBlocking &&
  input.googleSignInAvailable;
