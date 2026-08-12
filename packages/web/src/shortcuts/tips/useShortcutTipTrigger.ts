import { useEffect } from "react";
import {
  selectDraftActivity,
  selectIsEventFormOpen,
  useDraftStore,
} from "@web/events/stores/draft.store";
import {
  selectActiveShortcutTipId,
  shortcutTipsActions,
  useShortcutTipsStore,
} from "@web/shortcuts/tips/shortcut-tips.store";
import { useIsAnyCalendarEventFocused } from "@web/shortcuts/tips/useIsAnyCalendarEventFocused";

/**
 * Drives the quiet sidebar tip: eligible only when an event is focused and
 * the form is closed, and biased by recent mouse-vs-keyboard edit activity.
 */
export function useShortcutTipTrigger() {
  const eventFocused = useIsAnyCalendarEventFocused();
  const isFormOpen = useDraftStore(selectIsEventFormOpen);
  const activity = useDraftStore(selectDraftActivity);
  const activeTipId = useShortcutTipsStore(selectActiveShortcutTipId);

  useEffect(() => {
    shortcutTipsActions.recordActivity(activity ?? null);
  }, [activity]);

  useEffect(() => {
    if (eventFocused && !isFormOpen) {
      shortcutTipsActions.maybeRotate();
    } else {
      shortcutTipsActions.hide();
    }
  }, [eventFocused, isFormOpen]);

  // Encouragement-based, like the shortcut showcase's advance detection: the
  // matching keypress counts as "acted on" without verifying the resulting
  // action landed.
  useEffect(() => {
    if (!activeTipId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (
        activeTipId === "edit-sequence" &&
        !event.shiftKey &&
        !mod &&
        event.key.toLowerCase() === "e"
      ) {
        shortcutTipsActions.actedOn("edit-sequence");
      } else if (
        activeTipId === "nudge" &&
        event.shiftKey &&
        event.key.startsWith("Arrow")
      ) {
        shortcutTipsActions.actedOn("nudge");
      } else if (activeTipId === "target-event" && event.key === "Shift") {
        shortcutTipsActions.actedOn("target-event");
      } else if (activeTipId === "edge-cycle" && event.key === "Tab") {
        shortcutTipsActions.actedOn("edge-cycle");
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [activeTipId]);
}
