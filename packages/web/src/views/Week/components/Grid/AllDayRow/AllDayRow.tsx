import { type FC, type MouseEvent, type ReactNode, useMemo } from "react";
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

  const { startOfView } = weekProps.component;
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

    dispatch(draftSlice.actions.startGridClick(event));
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

  if (children) {
    return (
      <AllDayRowChildren
        allDayRowsCount={rowsCount}
        measurements={measurements}
        onAllDayMouseDown={onMouseDown}
        weekProps={weekProps}
      >
        {children}
      </AllDayRowChildren>
    );
  }

  return (
    <AllDayRowCalendar
      allDayRef={allDayRef}
      allDayRowRef={allDayRowRef}
      allDayRowsCount={rowsCount}
      measurements={measurements}
      onAllDayMouseDown={onMouseDown}
      weekProps={weekProps}
    />
  );
};

interface AllDayRowChildrenProps {
  allDayRowsCount: number;
  children: (props: AllDayRowRenderProps) => ReactNode;
  measurements: Measurements_Grid;
  onAllDayMouseDown: (event: MouseEvent<HTMLElement>) => Promise<void>;
  weekProps: WeekProps;
}

const AllDayRowChildren: FC<AllDayRowChildrenProps> = ({
  allDayRowsCount,
  children,
  measurements,
  onAllDayMouseDown,
  weekProps,
}) => {
  const allDayEventsLayer = useAllDayEventsLayer(measurements, weekProps);

  return (
    <>
      {children({
        allDayEventsLayer,
        allDayRowsCount,
        onAllDayMouseDown,
      })}
    </>
  );
};

interface AllDayRowCalendarProps {
  allDayRef: Ref_Callback;
  allDayRowRef: Ref_Callback;
  allDayRowsCount: number;
  measurements: Measurements_Grid;
  onAllDayMouseDown: (event: MouseEvent<HTMLElement>) => Promise<void>;
  weekProps: WeekProps;
}

const AllDayRowCalendar: FC<AllDayRowCalendarProps> = ({
  allDayRef,
  allDayRowRef,
  allDayRowsCount,
  measurements,
  onAllDayMouseDown,
  weekProps,
}) => {
  const { weekDays } = weekProps.component;
  const allDayEventsLayer = useAllDayEventsLayer(measurements, weekProps);

  return (
    <CalendarAllDayRow
      allDayColumnsRef={allDayRef}
      allDayRowRef={allDayRowRef}
      eventsLayer={allDayEventsLayer}
      gridOffsetTopPx={GRID_Y_START}
      rowsCount={allDayRowsCount}
      onMouseDown={onAllDayMouseDown}
      visibleDates={weekDays.map((date) => ({
        date,
        key: date.format(YEAR_MONTH_DAY_FORMAT),
      }))}
    />
  );
};

const useAllDayEventsLayer = (
  measurements: Measurements_Grid,
  weekProps: WeekProps,
) =>
  useMemo(
    () => (
      <AllDayEvents
        endOfView={weekProps.component.endOfView}
        measurements={measurements}
        startOfView={weekProps.component.startOfView}
      />
    ),
    [
      measurements,
      weekProps.component.endOfView,
      weekProps.component.startOfView,
    ],
  );
