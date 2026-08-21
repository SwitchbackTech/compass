import { type FC, type ReactNode, type RefCallback, useMemo } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { type Dayjs } from "@core/util/date/dayjs";
import { TimedGrid } from "@web/grid/components/TimedGrid";
import { MainGridBusyPeriods } from "@web/views/Week/components/Grid/MainGrid/MainGridBusyPeriods";
import { MainGridEvents } from "@web/views/Week/components/Grid/MainGrid/MainGridEvents";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";

interface Props {
  children?: (props: MainGridRenderProps) => ReactNode;
  mainGridElementRef: RefCallback<HTMLElement>;
  measurements: Measurements_Grid;
  today: Dayjs;
  timedColumnsElementRef: RefCallback<HTMLDivElement>;
  weekProps: WeekProps;
}

interface MainGridRenderProps {
  timedEventsLayer: ReactNode;
}

export const MainGrid: FC<Props> = ({
  children,
  mainGridElementRef,
  measurements,
  today,
  timedColumnsElementRef,
  weekProps,
}) => {
  const { component } = weekProps;
  const { weekDays } = component;

  if (children) {
    return (
      <MainGridChildren measurements={measurements} weekProps={weekProps}>
        {children}
      </MainGridChildren>
    );
  }

  return (
    <MainGridCalendar
      mainGridElementRef={mainGridElementRef}
      measurements={measurements}
      timedColumnsElementRef={timedColumnsElementRef}
      today={today}
      weekDays={weekDays}
      weekProps={weekProps}
    />
  );
};

interface MainGridChildrenProps {
  children: (props: MainGridRenderProps) => ReactNode;
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

const MainGridChildren: FC<MainGridChildrenProps> = ({
  children,
  measurements,
  weekProps,
}) => {
  const timedEventsLayer = useMemo(
    () => (
      <>
        <MainGridBusyPeriods
          measurements={measurements}
          weekProps={weekProps}
        />
        <MainGridEvents measurements={measurements} weekProps={weekProps} />
      </>
    ),
    [measurements, weekProps],
  );

  return (
    <>
      {children({
        timedEventsLayer,
      })}
    </>
  );
};

interface MainGridCalendarProps {
  mainGridElementRef: RefCallback<HTMLElement>;
  measurements: Measurements_Grid;
  timedColumnsElementRef: RefCallback<HTMLDivElement>;
  today: Dayjs;
  weekDays: Dayjs[];
  weekProps: WeekProps;
}

const MainGridCalendar: FC<MainGridCalendarProps> = ({
  mainGridElementRef,
  measurements,
  timedColumnsElementRef,
  today,
  weekDays,
  weekProps,
}) => {
  const timedEventsLayer = useMemo(
    () => (
      <>
        <MainGridBusyPeriods
          measurements={measurements}
          weekProps={weekProps}
        />
        <MainGridEvents measurements={measurements} weekProps={weekProps} />
      </>
    ),
    [measurements, weekProps],
  );

  return (
    <TimedGrid
      eventsLayer={timedEventsLayer}
      timedColumnsRef={timedColumnsElementRef}
      timedGridRef={mainGridElementRef}
      today={today}
      visibleDates={weekDays.map((date) => ({
        date,
        key: date.format(YEAR_MONTH_DAY_FORMAT),
      }))}
    />
  );
};
