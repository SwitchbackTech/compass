import { type CompassEvent } from "@core/types/compass-event.contracts";
import { type GridEvent } from "@web/common/types/web.event.types";
import { gridEventDraftToSchemaEvent } from "@web/events/grid-event-draft.adapter";
import { selectGridDraft, useDraftStore } from "@web/events/stores/draft.store";

export function useGridDraftSchemaOverlay(): CompassEvent | null {
  const gridDraft = useDraftStore(selectGridDraft);
  return gridDraft ? gridEventDraftToSchemaEvent(gridDraft) : null;
}

export function mergeGridEventWithDraftOverlay(
  event: GridEvent,
  draft: CompassEvent | null,
): GridEvent {
  if (!draft || event._id !== draft._id) {
    return event;
  }

  return { ...event, ...draft };
}
