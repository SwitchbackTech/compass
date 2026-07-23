import { type GridEvent } from "@web/common/types/web.event.types";
import { assignEventsToRow } from "@web/common/utils/grid/assign.row";
import { type GridEventDraft } from "@web/events/event-draft.types";
import {
  getGridDraftId,
  gridEventDraftToGridEvent,
} from "@web/events/grid-event-draft.adapter";

export const positionAllDayDraftEvent = ({
  draft,
  events,
}: {
  draft: GridEventDraft | null;
  events: GridEvent[];
}): {
  activeDraftEvent: GridEvent | null;
  events: GridEvent[];
} => {
  if (!draft || draft.values.schedule.kind !== "allDay") {
    return { activeDraftEvent: null, events };
  }

  const draftEvent = gridEventDraftToGridEvent(draft);
  const draftId = getGridDraftId(draft);
  const existingIndex = draftId
    ? events.findIndex((event) => event._id === draftId)
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
