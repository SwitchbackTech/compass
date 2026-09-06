import { create } from "zustand";
import { track } from "@web/auth/posthog/track";
import {
  getConnectCalendarPromptDismissed,
  markConnectCalendarPromptDismissed,
} from "@web/components/ConnectCalendarPrompt/connect-calendar.storage";

export type ConnectCalendarPromptState = {
  isDismissed: boolean;
};

export const initialConnectCalendarPromptState: ConnectCalendarPromptState = {
  isDismissed: getConnectCalendarPromptDismissed(),
};

export const useConnectCalendarPromptStore = create<ConnectCalendarPromptState>(
  () => ({
    ...initialConnectCalendarPromptState,
  }),
);

export const connectCalendarPromptActions = {
  dismiss: () => {
    track("connect_calendar_prompt_dismissed");
    markConnectCalendarPromptDismissed();
    useConnectCalendarPromptStore.setState({ isDismissed: true });
  },
};

export const resetConnectCalendarPromptStoreForTests = (): void => {
  useConnectCalendarPromptStore.setState(
    initialConnectCalendarPromptState,
    true,
  );
};

export const selectConnectCalendarPromptDismissed = (
  state: ConnectCalendarPromptState,
): boolean => state.isDismissed;
