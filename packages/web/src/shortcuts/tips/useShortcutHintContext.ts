import {
  selectFirstEventCelebrating,
  selectFirstEventDone,
  useFirstEventPromptStore,
} from "@web/components/FirstEventPrompt/first-event.store";
import { isLifePathname } from "@web/components/RootShell/isLifePathname";
import {
  selectIsEventFormOpen,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { selectShortcutHint } from "@web/shortcuts/tips/selectShortcutHint";
import { useIsAnyCalendarEventFocused } from "@web/shortcuts/tips/useIsAnyCalendarEventFocused";

/**
 * Reads onboarding + current-doing stores and returns the sidebar's next
 * shortcut. Life vs calendar is taken from the page URL: Day/Week and Life
 * each mount their own status bar, so a pathname read is current on mount.
 */
export function useShortcutHintContext() {
  const firstEventDone = useFirstEventPromptStore(selectFirstEventDone);
  const isCelebrating = useFirstEventPromptStore(selectFirstEventCelebrating);
  const isFormOpen = useDraftStore(selectIsEventFormOpen);
  const eventFocused = useIsAnyCalendarEventFocused();
  const isLifeView = isLifePathname(window.location.pathname);

  return selectShortcutHint({
    isFormOpen,
    isLifeView,
    eventFocused,
    firstEventDone: firstEventDone || isCelebrating,
  });
}
