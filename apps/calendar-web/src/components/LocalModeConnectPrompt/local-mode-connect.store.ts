import { create } from "zustand";
import { readAnonymousCalendarWriteCount } from "@web/auth/posthog/anon-calendar-write-count.util";
import { trackSignupStartedAtClick } from "@web/auth/posthog/signup-funnel";
import { track } from "@web/auth/posthog/track";
import {
  isLocalModeConnectPromptDismissed,
  markLocalModeConnectPromptDismissed,
} from "@web/components/LocalModeConnectPrompt/local-mode-connect.storage";

export type LocalModeConnectPromptState = {
  writeCount: number;
  isDismissed: boolean;
};

export const initialLocalModeConnectPromptState: LocalModeConnectPromptState = {
  writeCount: readAnonymousCalendarWriteCount(),
  isDismissed: isLocalModeConnectPromptDismissed(),
};

export const useLocalModeConnectPromptStore =
  create<LocalModeConnectPromptState>(() => ({
    ...initialLocalModeConnectPromptState,
  }));

let hasTrackedShown = false;

export const localModeConnectPromptActions = {
  syncFromStorage: () => {
    useLocalModeConnectPromptStore.setState({
      writeCount: readAnonymousCalendarWriteCount(),
      isDismissed: isLocalModeConnectPromptDismissed(),
    });
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
    markLocalModeConnectPromptDismissed();
    useLocalModeConnectPromptStore.setState({ isDismissed: true });
  },
};

export const resetLocalModeConnectPromptStoreForTests = (): void => {
  hasTrackedShown = false;
  useLocalModeConnectPromptStore.setState(
    {
      writeCount: readAnonymousCalendarWriteCount(),
      isDismissed: isLocalModeConnectPromptDismissed(),
    },
    true,
  );
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
  threshold: number;
};

export const selectLocalModeConnectPromptEligible = (
  input: LocalModeConnectPromptEligibility,
): boolean =>
  !input.authenticated &&
  !input.hasUserEverAuthenticated &&
  input.storageAvailable &&
  !input.isDismissed &&
  input.writeCount >= input.threshold &&
  !input.isAuthModalOpen &&
  !input.isShowcaseActive &&
  !input.isWelcomeBlocking &&
  input.googleSignInAvailable;
