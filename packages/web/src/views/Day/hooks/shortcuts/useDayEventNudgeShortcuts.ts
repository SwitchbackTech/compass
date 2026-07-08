import { useUpdateEvent } from "@web/common/hooks/useUpdateEvent";
import { useAppHotkey } from "@web/common/hotkeys/useAppHotkey";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { refocusEventElement } from "@web/common/utils/event/event.util";
import {
  getArrowKeyMovement,
  nudgeEventDates,
} from "@web/common/utils/event/event-nudge.util";
import { isEventFormOpen } from "@web/common/utils/form/form.util";
import { draftActions } from "@web/events/stores/draft.store";
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

    const movement = getArrowKeyMovement(keyboardEvent.key, false);
    if (!movement) return;

    const dates = nudgeEventDates(event, movement);
    if (!dates) return;

    keyboardEvent.preventDefault();
    updateEvent({ event: { ...event, ...dates } }, true);
    draftActions.discard();
    refocusEventElement(event._id);
  };

  useAppHotkey("Shift+ArrowUp", nudgeFocusedEvent);
  useAppHotkey("Shift+ArrowDown", nudgeFocusedEvent);
}
