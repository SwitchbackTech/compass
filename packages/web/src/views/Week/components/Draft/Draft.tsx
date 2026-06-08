import { type FC, useMemo } from "react";
import { createPortal } from "react-dom";
import { Categories_Event } from "@core/types/event.types";
import { positionAllDayDraftEvent } from "@web/common/calendar-grid/layout/allDayDraftEventPosition";
import { getDraftContainer } from "@web/common/utils/draft/draft.util";
import { selectDraftCategory } from "@web/ducks/events/selectors/draft.selectors";
import {
  selectAllDayEvents,
  selectGridEvents,
} from "@web/ducks/events/selectors/event.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { useDraftContext } from "./context/useDraftContext";
import { getActiveTimedDraftDeckLayout } from "./grid/activeTimedDraftDeckLayout";
import { GridDraft } from "./grid/GridDraft";
import { useGridMouseMove } from "./grid/hooks/useGridMouseMove";
import { useGridMouseUp } from "./grid/hooks/useGridMouseUp";

interface Props {
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

export const Draft: FC<Props> = ({ measurements, weekProps }) => {
  useGridMouseUp();
  useGridMouseMove();

  const category = useAppSelector(selectDraftCategory);
  const allDayEvents = useAppSelector(selectAllDayEvents);
  const timedEvents = useAppSelector(selectGridEvents);
  const { state } = useDraftContext();
  const { draft } = state;
  const activeAllDayDraftEvent = useMemo(
    () =>
      positionAllDayDraftEvent({
        draft,
        events: allDayEvents,
      }).activeDraftEvent,
    [allDayEvents, draft],
  );
  const deckLayout = useMemo(
    () => getActiveTimedDraftDeckLayout(draft, timedEvents),
    [draft, timedEvents],
  );

  if (draft?.isAllDay === undefined) {
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
        weekProps={weekProps}
      />
    ),
    container,
  );
};
