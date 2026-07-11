import { type Schema_Event } from "@core/types/event.types";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  assembleGridEvent,
  hasEventDates,
} from "@web/common/utils/event/event.util";
import { assignEventsToRow } from "@web/common/utils/grid/assign.row";

export const positionAllDayDraftEvent = ({
  draft,
  events,
}: {
  draft: Schema_Event | null;
  events: Schema_GridEvent[];
}): {
  activeDraftEvent: Schema_GridEvent | null;
  events: Schema_GridEvent[];
} => {
  if (!draft?.isAllDay || !hasEventDates(draft)) {
    return { activeDraftEvent: null, events };
  }

  const draftEvent = assembleGridEvent(draft);
  const existingIndex = draftEvent._id
    ? events.findIndex((event) => event._id === draftEvent._id)
    : -1;
  const eventForRows =
    existingIndex === -1
      ? draftEvent
      : {
          ...draftEvent,
          position: events[existingIndex].position,
          row: events[existingIndex].row,
        };
  const eventsWithDraft =
    existingIndex === -1
      ? [...events, eventForRows]
      : events.map((event, index) =>
          index === existingIndex ? eventForRows : event,
        );
  const positionedEvents = assignEventsToRow(eventsWithDraft).allDayEvents;
  const activeDraftIndex =
    existingIndex === -1 ? positionedEvents.length - 1 : existingIndex;

  return {
    activeDraftEvent: positionedEvents[activeDraftIndex] ?? null,
    events: positionedEvents,
  };
};
