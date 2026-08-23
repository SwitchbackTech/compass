import { type FC, type ReactNode, type RefCallback, useMemo } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { useWeekEventViewModel } from "@web/events/queries/useWeekEventsQuery";
import { AllDayGridRow } from "@web/grid/components/AllDayGridRow";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { GRID_Y_START } from "@web/views/Week/layout.constants";
import { AllDayEvents } from "./AllDayEvents";

interface Props {
  children?: (props: AllDayRowRenderProps) => ReactNode;
  allDayRef: RefCallback<HTMLDivElement>;
  allDayRowRef: RefCallback<HTMLElement>;
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

interface AllDayRowRenderProps {
  allDayEventsLayer: ReactNode;
  allDayRowsCount: number;
}

export const AllDayRow: FC<Props> = ({
  allDayRef,
  allDayRowRef,
  children,
  measurements,
  weekProps,
}) => {
  const { endOfView, startOfView } = weekProps.query;
  const { rowCount: rowsCount } = useWeekEventViewModel({
    startOfView,
    endOfView,
  });

  if (children) {
    return (
      <AllDayRowChildren
        allDayRowsCount={rowsCount}
        measurements={measurements}
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
      weekProps={weekProps}
    />
  );
};

interface AllDayRowChildrenProps {
  allDayRowsCount: number;
  children: (props: AllDayRowRenderProps) => ReactNode;
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

const AllDayRowChildren: FC<AllDayRowChildrenProps> = ({
  allDayRowsCount,
  children,
  measurements,
  weekProps,
}) => {
  const allDayEventsLayer = useAllDayEventsLayer(measurements, weekProps);

  return (
    <>
      {children({
        allDayEventsLayer,
        allDayRowsCount,
      })}
    </>
  );
};

interface AllDayRowCalendarProps {
  allDayRef: RefCallback<HTMLDivElement>;
  allDayRowRef: RefCallback<HTMLElement>;
  allDayRowsCount: number;
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

const AllDayRowCalendar: FC<AllDayRowCalendarProps> = ({
  allDayRef,
  allDayRowRef,
  allDayRowsCount,
  measurements,
  weekProps,
}) => {
  const { weekDays } = weekProps.component;
  const allDayEventsLayer = useAllDayEventsLayer(measurements, weekProps);

  return (
    <AllDayGridRow
      allDayColumnsRef={allDayRef}
      allDayRowRef={allDayRowRef}
      eventsLayer={allDayEventsLayer}
      gridOffsetTopPx={GRID_Y_START}
      rowsCount={allDayRowsCount}
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
        measurements={measurements}
        queryEndOfView={weekProps.query.endOfView}
        queryStartOfView={weekProps.query.startOfView}
        weekDays={weekProps.component.weekDays}
      />
    ),
    [
      measurements,
      weekProps.component.weekDays,
      weekProps.query.endOfView,
      weekProps.query.startOfView,
    ],
  );
