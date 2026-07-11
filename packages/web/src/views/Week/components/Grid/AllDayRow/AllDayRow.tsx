import { type FC, type MouseEvent, type ReactNode, useMemo } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { type Schema_Event } from "@core/types/event.types";
import { type Ref_Callback } from "@web/common/types/util.types";
import { useWeekEventViewModel } from "@web/events/queries/useWeekEventsQuery";
import { draftActions } from "@web/events/stores/draft.store";
import { CalendarAllDayRow } from "@web/layout/calendar-grid/components/CalendarAllDayRow";
import { useAllDayDraftCreation } from "@web/layout/calendar-grid/hooks/useAllDayDraftCreation";
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
  onAllDayMouseDown: (event: MouseEvent<HTMLElement>) => void;
}

export const AllDayRow: FC<Props> = ({
  allDayRef,
  allDayRowRef,
  children,
  dateCalcs,
  measurements,
  weekProps,
}) => {
  const { endOfView, startOfView } = weekProps.component;
  const { rowCount: rowsCount } = useWeekEventViewModel({
    startOfView,
    endOfView,
  });
  const getAllDayDraftStartDate = (clientX: number, clientY: number) =>
    dateCalcs.getDateStrByXY(
      clientX,
      clientY,
      startOfView,
      YEAR_MONTH_DAY_FORMAT,
    );
  const openAllDayDraft = (event: Schema_Event) => {
    draftActions.startGridClick(event);
  };
  const onMouseDown = useAllDayDraftCreation({
    getStartDate: getAllDayDraftStartDate,
    onCreateDraft: openAllDayDraft,
  });

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
  onAllDayMouseDown: (event: MouseEvent<HTMLElement>) => void;
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
  onAllDayMouseDown: (event: MouseEvent<HTMLElement>) => void;
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
        weekDays={weekProps.component.weekDays}
      />
    ),
    [
      measurements,
      weekProps.component.endOfView,
      weekProps.component.startOfView,
      weekProps.component.weekDays,
    ],
  );
