import { create } from "zustand";
import { readAnonymousCalendarWriteCount } from "@web/auth/posthog/anon-calendar-write-count.util";
import {
  isAnonymousExplorerEngaged,
  readAnonymousShortcutEngagementCount,
} from "@web/auth/posthog/anon-explorer-engagement.util";
import { trackSignupStartedAtClick } from "@web/auth/posthog/signup-funnel";
import { track } from "@web/auth/posthog/track";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";

export type LocalModeConnectPromptState = {
  writeCount: number;
  shortcutEngagementCount: number;
  isDismissed: boolean;
};

const snapshotFromStorage = (): LocalModeConnectPromptState => ({
  writeCount: readAnonymousCalendarWriteCount(),
  shortcutEngagementCount: readAnonymousShortcutEngagementCount(),
  isDismissed:
    persistentBrowserStore.get(
      STORAGE_KEYS.HAS_DISMISSED_LOCAL_MODE_CONNECT_PROMPT,
    ) === "true",
});

export const useLocalModeConnectPromptStore =
  create<LocalModeConnectPromptState>(() => snapshotFromStorage());

let hasTrackedShown = false;

/** The prompt only ever nudges Google, so every event carries the same shape. */
const trackPrompt = (
  event:
    | "connect_prompt_shown"
    | "connect_prompt_clicked"
    | "connect_prompt_dismissed",
  eventsCreatedCount: number,
): void => {
  track(event, {
    events_created_count: eventsCreatedCount,
    provider: "google",
  });
};

export const localModeConnectPromptActions = {
  syncFromStorage: () => {
    useLocalModeConnectPromptStore.setState(snapshotFromStorage());
  },
  markShown: (eventsCreatedCount: number) => {
    if (hasTrackedShown) return;
    hasTrackedShown = true;
    trackPrompt("connect_prompt_shown", eventsCreatedCount);
  },
  connect: (eventsCreatedCount: number) => {
    trackPrompt("connect_prompt_clicked", eventsCreatedCount);
    void trackSignupStartedAtClick("local_mode_connect_prompt");
  },
  dismiss: (eventsCreatedCount: number) => {
    trackPrompt("connect_prompt_dismissed", eventsCreatedCount);
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

export const selectLocalModeConnectPromptShortcutEngagementCount = (
  state: LocalModeConnectPromptState,
): number => state.shortcutEngagementCount;

export const selectLocalModeConnectPromptDismissed = (
  state: LocalModeConnectPromptState,
): boolean => state.isDismissed;

export type LocalModeConnectPromptEligibility = {
  authenticated: boolean;
  hasUserEverAuthenticated: boolean;
  writeCount: number;
  shortcutEngagementCount: number;
  isDismissed: boolean;
  storageAvailable: boolean;
  isAuthModalOpen: boolean;
  isShowcaseActive: boolean;
  isWelcomeBlocking: boolean;
  googleSignInAvailable: boolean;
  firstEventPromptVisible: boolean;
  firstEventCelebrating: boolean;
};

export const selectLocalModeConnectPromptEligible = (
  input: LocalModeConnectPromptEligibility,
): boolean => {
  if (
    input.authenticated ||
    input.hasUserEverAuthenticated ||
    !input.storageAvailable ||
    input.isDismissed ||
    !isAnonymousExplorerEngaged(
      input.writeCount,
      input.shortcutEngagementCount,
    ) ||
    input.isAuthModalOpen ||
    input.isShowcaseActive ||
    input.isWelcomeBlocking ||
    !input.googleSignInAvailable ||
    input.firstEventCelebrating
  ) {
    return false;
  }

  if (input.firstEventPromptVisible && input.writeCount === 0) {
    return false;
  }

  return true;
};
