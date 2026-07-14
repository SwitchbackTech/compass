import { type GridEvent } from "@web/common/types/web.event.types";
import { refocusEventElement } from "@web/common/utils/event/event.util";
import {
  getArrowKeyMovement,
  nudgeEventDates,
} from "@web/common/utils/event/event-nudge.util";

export function nudgeEventFromKeyboard({
  afterNudge,
  event,
  keyboardEvent,
  onNudge,
}: {
  afterNudge?: () => void;
  event: GridEvent;
  keyboardEvent: KeyboardEvent;
  onNudge: (event: GridEvent) => void;
}): boolean {
  if (!event._id) return false;

  const movement = getArrowKeyMovement(
    keyboardEvent.key,
    Boolean(event.isAllDay),
  );
  if (!movement) return false;

  const dates = nudgeEventDates(event, movement);
  if (!dates) return false;

  keyboardEvent.preventDefault();
  onNudge({ ...event, ...dates });
  afterNudge?.();
  refocusEventElement(event._id);
  return true;
}
