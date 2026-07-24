import { type FC, useMemo } from "react";
import { createPortal } from "react-dom";
import { Origin } from "@core/constants/core.constants";
import { type GridEvent } from "@web/common/types/web.event.types";
import { getDraftContainer } from "@web/common/utils/draft/draft.util";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { gridEventDraftToSchemaEvent } from "@web/events/grid-event-draft.adapter";
import { useWeekEventViewModel } from "@web/events/queries/useWeekEventsQuery";
import { selectGridDraft, useDraftStore } from "@web/events/stores/draft.store";
import { positionAllDayDraftEvent } from "@web/grid/layout/all-day-draft.position";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { useDraftContext } from "./context/useDraftContext";
import { getActiveTimedDraftDeckLayout } from "./grid/activeTimedDraftDeckLayout";
import { GridDraft } from "./grid/GridDraft";
import { getRecurringDraftPreviews } from "./grid/getRecurringDraftPreviews";
import { useGridMouseMove } from "./grid/hooks/useGridMouseMove";
import { useGridMouseUp } from "./grid/hooks/useGridMouseUp";

interface Props {
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

export const Draft: FC<Props> = ({ measurements, weekProps }) => {
  useGridMouseUp();
  useGridMouseMove();

  const { allDayEvents, timedEvents } = useWeekEventViewModel({
    startOfView: weekProps.query.startOfView,
    endOfView: weekProps.query.endOfView,
  });
  const { setters, state } = useDraftContext();
  const { draft, isDragging, isFormOpen, isResizing } = state;
  const { setDraft } = setters;
  const gridDraftFromStore = useDraftStore(selectGridDraft);

  // Sidebar edits and context-menu Edit write the shared draft store.
  // Mirror into Week local draft while the form is idle so the portal
  // overlay stays in sync without ContextMenu/Sidebar depending on
  // DraftContext. Adjust during render (not useEffect) so context-menu
  // Edit — which only flips store isFormOpen — does not flash an empty
  // portal for a frame before GridDraft can read local `draft`.
  if (
    !isDragging &&
    !isResizing &&
    isFormOpen &&
    gridDraftFromStore &&
    draft !== gridDraftFromStore
  ) {
    setDraft(gridDraftFromStore);
  }

  // GridEvent-shaped projection of the canonical GridEventDraft, for
  // the still-unconverted grid-layout helpers below (deck layout, all-day
  // positioning, recurrence previews) — see grid-event-draft.adapter.ts's
  // gridEventDraftToSchemaEvent doc comment. `position` is a placeholder
  // default: these helpers never read it, only startDate/endDate/isAllDay/
  // recurrence/_id.
  const draftSchemaEvent: GridEvent | null = useMemo(
    () =>
      draft
        ? ({
            ...gridEventDraftToSchemaEvent(draft),
            origin: Origin.COMPASS,
            user: "",
            position: gridEventDefaultPosition,
          } as GridEvent)
        : null,
    [draft],
  );
  const activeAllDayDraftEvent = useMemo(
    () =>
      positionAllDayDraftEvent({
        draft,
        events: allDayEvents,
      }).activeDraftEvent,
    [allDayEvents, draft],
  );
  const deckLayout = useMemo(
    () =>
      getActiveTimedDraftDeckLayout(draftSchemaEvent, [
        ...timedEvents,
        ...allDayEvents,
      ]),
    [allDayEvents, draftSchemaEvent, timedEvents],
  );
  const recurringPreviews = useMemo(
    () =>
      getRecurringDraftPreviews(
        draftSchemaEvent,
        weekProps.component.startOfView,
        weekProps.component.endOfView,
      ),
    [
      draftSchemaEvent,
      weekProps.component.startOfView,
      weekProps.component.endOfView,
    ],
  );

  if (!draft) {
    return null;
  }

  const container = getDraftContainer(draft);
  if (!container) return null;

  return createPortal(
    <GridDraft
      activeAllDayDraftEvent={activeAllDayDraftEvent}
      deckLayout={deckLayout}
      measurements={measurements}
      recurringPreviews={recurringPreviews}
      weekProps={weekProps}
    />,
    container,
  );
};
