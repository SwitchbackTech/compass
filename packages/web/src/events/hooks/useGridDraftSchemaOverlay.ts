import { useMemo } from "react";
import { type CompassEvent } from "@core/types/compass-event.contracts";
import { type GridEvent } from "@web/common/types/web.event.types";
import { gridEventDraftToSchemaEvent } from "@web/events/grid-event-draft.adapter";
import { selectGridDraft, useDraftStore } from "@web/events/stores/draft.store";

export function useGridDraftSchemaOverlay(): CompassEvent | null {
  const gridDraft = useDraftStore(selectGridDraft);

  return useMemo(
    () => (gridDraft ? gridEventDraftToSchemaEvent(gridDraft) : null),
    [gridDraft],
  );
}

export function mergeGridEventWithDraftOverlay(
  event: GridEvent,
  draftId: string | undefined,
  draft: CompassEvent | null,
): GridEvent {
  if (!draftId || !draft || event._id !== draftId) {
    return event;
  }

  return { ...event, ...draft };
}
