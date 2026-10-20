import { hasUserEverAuthenticated } from "@web/auth/compass/state/auth.state.util";
import { incrementAnonymousCalendarWriteCount } from "@web/auth/posthog/anon-calendar-write-count.util";
import { incrementAnonymousShortcutEngagementCount } from "@web/auth/posthog/anon-explorer-engagement.util";
import { localModeConnectPromptActions } from "@web/components/LocalModeConnectPrompt/local-mode-connect.store";

/** Counts an anonymous calendar write and refreshes the sign-up nudge store. */
export function noteAnonymousCalendarWriteEngagement(): void {
  incrementAnonymousCalendarWriteCount();
  localModeConnectPromptActions.syncFromStorage();
}

/** Counts a handled shortcut for never-authenticated visitors. */
export function noteAnonymousShortcutEngagementIfEligible(): void {
  if (hasUserEverAuthenticated()) return;
  incrementAnonymousShortcutEngagementCount();
  localModeConnectPromptActions.syncFromStorage();
}
