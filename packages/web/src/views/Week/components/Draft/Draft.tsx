import { type FC, useMemo } from "react";
import { createPortal } from "react-dom";
import { Origin } from "@core/constants/core.constants";
import { Categories_Event } from "@core/types/event.types";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { getDraftContainer } from "@web/common/utils/draft/draft.util";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { gridEventDraftToSchemaEvent } from "@web/events/grid-event-draft.adapter";
import { useWeekEventViewModel } from "@web/events/queries/useWeekEventsQuery";
import {
  selectDraftCategory,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { positionAllDayDraftEvent } from "@web/layout/calendar-grid/layout/allDayDraftEventPosition";
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

  const category = useDraftStore(selectDraftCategory);
  const { allDayEvents, timedEvents } = useWeekEventViewModel({
    startOfView: weekProps.component.startOfView,
    endOfView: weekProps.component.endOfView,
  });
  const { state } = useDraftContext();
  const { draft } = state;
  // Schema_GridEvent-shaped projection of the canonical GridEventDraft, for
  // the still-unconverted grid-layout helpers below (deck layout, all-day
  // positioning, recurrence previews) — see grid-event-draft.adapter.ts's
  // gridEventDraftToSchemaEvent doc comment. `position` is a placeholder
  // default: these helpers never read it, only startDate/endDate/isAllDay/
  // recurrence/_id.
  const draftSchemaEvent: Schema_GridEvent | null = useMemo(
    () =>
      draft
        ? ({
            ...gridEventDraftToSchemaEvent(draft),
            origin: Origin.COMPASS,
            user: "",
            position: gridEventDefaultPosition,
          } as Schema_GridEvent)
        : null,
    [draft],
  );
  const activeAllDayDraftEvent = useMemo(
    () =>
      positionAllDayDraftEvent({
        draft: draftSchemaEvent,
        events: allDayEvents,
      }).activeDraftEvent,
    [allDayEvents, draftSchemaEvent],
  );
  const deckLayout = useMemo(
    () => getActiveTimedDraftDeckLayout(draftSchemaEvent, timedEvents),
    [draftSchemaEvent, timedEvents],
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
  if (!category) return null;

  const container = getDraftContainer(category);
  if (!container) return null;

  const isGridDraft =
    category === Categories_Event.ALLDAY || category === Categories_Event.TIMED;

  return createPortal(
    isGridDraft && (
      <GridDraft
        activeAllDayDraftEvent={activeAllDayDraftEvent}
        deckLayout={deckLayout}
        measurements={measurements}
        recurringPreviews={recurringPreviews}
        weekProps={weekProps}
      />
    ),
    container,
  );
};
