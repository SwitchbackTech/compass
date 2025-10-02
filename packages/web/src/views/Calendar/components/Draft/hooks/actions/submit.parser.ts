import { Origin, Priorities } from "@core/constants/core.constants";
import {
  Schema_GridEvent,
  Schema_SomedayEvent,
  Schema_WebEvent,
} from "@web/common/types/web.event.types";
import { assembleGridEvent } from "@web/common/utils/event/event.util";
import { validateGridEvent } from "@web/common/validators/grid.event.validator";
import { validateSomedayEvent } from "@web/common/validators/someday.event.validator";

export class OnSubmitParser {
  private readonly event: Schema_GridEvent | Schema_SomedayEvent;

  constructor(event: Schema_GridEvent) {
    this.event = event;
  }

  public parse() {
    if (this.event.isSomeday) {
      return parseSomedayEventBeforeSubmit(
        this.event as Schema_SomedayEvent,
        this.event.user,
      );
    }
    console.log("this.event", this.event);
    return prepEventBeforeSubmit(this.event, this.event.user);
  }
}

export const parseSomedayEventBeforeSubmit = (
  draft: Schema_SomedayEvent,
  userId: string,
): Schema_SomedayEvent => {
  const _event: Omit<Schema_SomedayEvent, "recurrence"> = {
    ...draft,
    origin: Origin.COMPASS,
    user: userId,
    _id: draft._id,
    startDate: draft.startDate,
    endDate: draft.endDate,
    priority: draft.priority ?? Priorities.UNASSIGNED,
  };

  if (draft.recurrence) Object.assign(_event, { recurrence: draft.recurrence });

  const event = validateSomedayEvent(_event);

  return event;
};

export const prepEventBeforeSubmit = (
  draft: Schema_GridEvent,
  userId: string,
): Schema_WebEvent => {
  const _event = {
    ...draft,
    origin: draft.origin ?? Origin.COMPASS,
    user: userId,
  };

  if (draft.recurrence) Object.assign(_event, { recurrence: draft.recurrence });

  // Ensure the event has a position field for grid validation
  // If it doesn't have one (e.g., all-day events), convert it to a grid event first
  const eventWithPosition =
    _event.position && _event.position.isOverlapping
      ? _event
      : assembleGridEvent(_event);

  const event = validateGridEvent(eventWithPosition);
  return event;
};
