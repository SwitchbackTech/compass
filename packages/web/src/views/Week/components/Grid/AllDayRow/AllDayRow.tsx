import { type FC, type MouseEvent, type ReactNode } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Categories_Event } from "@core/types/event.types";
import { CalendarAllDayRow } from "@web/common/calendar-grid/components/CalendarAllDayRow";
import { type Ref_Callback } from "@web/common/types/util.types";
import { assembleDefaultEvent } from "@web/common/utils/event/event.util";
import { isRightClick } from "@web/common/utils/mouse/mouse.util";
import { selectIsDrafting } from "@web/ducks/events/selectors/draft.selectors";
import { selectRowCount } from "@web/ducks/events/selectors/event.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { GRID_Y_START } from "@web/views/Week/layout.constants";
import { AllDayEvents } from "./AllDayEvents";

interface Props {
  children?: (props: AllDayRowRenderProps) => ReactNode;
  dateCalcs: DateCalcs;
  allDayRef: Ref_Callback;
  allDayRowRef: Ref_Callback;
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

interface AllDayRowRenderProps {
  allDayEventsLayer: ReactNode;
  allDayRowsCount: number;
  onAllDayMouseDown: (event: MouseEvent<HTMLElement>) => Promise<void>;
}

export const AllDayRow: FC<Props> = ({
  allDayRef,
  allDayRowRef,
  children,
  dateCalcs,
  measurements,
  weekProps,
}) => {
  const dispatch = useAppDispatch();

  const { startOfView, weekDays } = weekProps.component;
  const rowsCount = useAppSelector(selectRowCount);
  const isDrafting = useAppSelector(selectIsDrafting);

  const startAlldayDraft = async (e: MouseEvent) => {
    const startDate = dateCalcs.getDateStrByXY(
      e.clientX,
      e.clientY,
      startOfView,
      YEAR_MONTH_DAY_FORMAT,
    );

    const event = await assembleDefaultEvent(
      Categories_Event.ALLDAY,
      startDate,
    );

    dispatch(
      draftSlice.actions.start({
        activity: "gridClick",
        eventType: Categories_Event.ALLDAY,
        event,
      }),
    );
  };

  const onMouseDown = async (e: MouseEvent) => {
    if (isDrafting) {
      dispatch(draftSlice.actions.discard(undefined));
      return;
    }

    if (isRightClick(e)) {
      return;
    }

    await startAlldayDraft(e);
  };

  const allDayEventsLayer = (
    <AllDayEvents
      measurements={measurements}
      startOfView={weekProps.component.startOfView}
      endOfView={weekProps.component.endOfView}
    />
  );

  if (children) {
    return (
      <>
        {children({
          allDayEventsLayer,
          allDayRowsCount: rowsCount,
          onAllDayMouseDown: onMouseDown,
        })}
      </>
    );
  }

  return (
    <CalendarAllDayRow
      allDayColumnsRef={allDayRef}
      allDayRowRef={allDayRowRef}
      eventsLayer={allDayEventsLayer}
      gridOffsetTopPx={GRID_Y_START}
      rowsCount={rowsCount}
      onMouseDown={onMouseDown}
      visibleDates={weekDays.map((date) => ({
        date,
        key: date.format(YEAR_MONTH_DAY_FORMAT),
      }))}
    />
  );
};
