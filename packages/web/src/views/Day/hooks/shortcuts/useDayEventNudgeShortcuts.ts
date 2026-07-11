import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { nudgeEventFromKeyboard } from "@web/common/utils/event/event-nudge-shortcut.util";
import { isEventFormOpen } from "@web/common/utils/form/form.util";
import { useUpdateEvent } from "@web/events/mutations/useUpdateEvent";
import { draftActions } from "@web/events/stores/draft.store";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";
import { getFocusedDayCalendarEventTarget } from "@web/views/Day/interaction/targeting/dayCalendarEventTargeting";

/**
 * Shift+ArrowUp/Down moves the focused timed calendar event by 15 minutes.
 * Day-view events intentionally have no Shift+ArrowLeft/Right day moves yet.
 */
export function useDayEventNudgeShortcuts({
  timedEvents,
}: {
  timedEvents: Schema_GridEvent[];
}) {
  const updateEvent = useUpdateEvent();

  // TanStack Hotkeys syncs callbacks on every render, so this closure always
  // sees the latest timedEvents (no refs needed)
  const nudgeFocusedEvent = (keyboardEvent: KeyboardEvent) => {
    if (isEventFormOpen()) return;

    const target = getFocusedDayCalendarEventTarget();
    if (!target || target.eventType !== "timed") return;

    const event = timedEvents.find(
      (candidate) => candidate._id === target.eventId,
    );
    if (!event?._id) return;

    nudgeEventFromKeyboard({
      event,
      keyboardEvent,
      onNudge: (event) => updateEvent({ event }, true),
      afterNudge: () => draftActions.discard(),
    });
  };

  useAppShortcut("Shift+ArrowUp", nudgeFocusedEvent);
  useAppShortcut("Shift+ArrowDown", nudgeFocusedEvent);
}
