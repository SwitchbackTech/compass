import { type FC, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Origin } from "@core/constants/core.constants";
import { type GridEvent } from "@web/common/types/web.event.types";
import { getDraftContainer } from "@web/common/utils/draft/draft.util";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { gridEventDraftToSchemaEvent } from "@web/events/grid-event-draft.adapter";
import { useWeekEventViewModel } from "@web/events/queries/useWeekEventsQuery";
import {
  selectDraftActivity,
  selectGridDraft,
  useDraftStore,
} from "@web/events/stores/draft.store";
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
  const { actions, state } = useDraftContext();
  const { draft, isDragging, isFormOpen, isResizing } = state;
  const { setLocalDraft } = actions;
  const gridDraftFromStore = useDraftStore(selectGridDraft);
  const activity = useDraftStore(selectDraftActivity);

  // Context-menu Edit only flips store isFormOpen (handleChange skips
  // eventRightClick), so hydrate local draft during render — otherwise the
  // portal would lag a frame behind the sidebar form. Allow a non-null
  // overwrite only for eventRightClick: an earlier create/nudge can leave
  // stale local state, but keyboard repositioning (other activities) updates
  // local only and must not be undone here.
  if (
    !isDragging &&
    !isResizing &&
    isFormOpen &&
    gridDraftFromStore &&
    (draft === null || activity === "eventRightClick")
  ) {
    setLocalDraft(gridDraftFromStore);
  }

  // Sidebar edits write the shared draft store. Mirror into Week local draft
  // when the store draft changes while the form is idle.
  useEffect(() => {
    if (isDragging || isResizing || !isFormOpen || !gridDraftFromStore) {
      return;
    }

    setLocalDraft(gridDraftFromStore);
  }, [gridDraftFromStore, isDragging, isFormOpen, isResizing, setLocalDraft]);

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
