import { Origin } from "@core/constants/core.constants";
import {
  type GridEvent,
  type WebEvent,
} from "@web/common/types/web.event.types";
import { assembleGridEvent } from "@web/common/utils/event/event.util";
import { validateGridEvent } from "@web/common/validators/grid.event.validator";

export class OnSubmitParser {
  private readonly event: GridEvent;

  constructor(event: GridEvent) {
    this.event = event;
  }

  public parse() {
    return prepEventBeforeSubmit(this.event, this.event.user ?? "");
  }
}

export const prepEventBeforeSubmit = (
  draft: GridEvent,
  userId: string,
): WebEvent => {
  if (!draft.startDate || !draft.endDate) {
    throw new Error("Event requires startDate and endDate");
  }

  const _event = {
    ...draft,
    origin: draft.origin ?? Origin.COMPASS,
    user: userId,
  };

  if (draft.recurrence) {
    Object.assign(_event, {
      recurrence: draft.recurrence as WebEvent["recurrence"],
    });
  }

  // Ensure the event has a position field for grid validation
  // If it doesn't have one (e.g., all-day events), convert it to a grid event first
  const eventWithPosition = _event.position?.isOverlapping
    ? _event
    : assembleGridEvent(_event);

  const event = validateGridEvent(eventWithPosition);
  return event;
};
