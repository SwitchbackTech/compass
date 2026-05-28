import { type FC, type MutableRefObject, type ReactNode, useMemo } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { type Dayjs } from "@core/util/date/dayjs";
import { CalendarTimedGrid } from "@web/common/calendar-grid/components/CalendarTimedGrid";
import { type Ref_Callback } from "@web/common/types/util.types";
import { MainGridEvents } from "@web/views/Week/components/Grid/MainGrid/MainGridEvents";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import { useDragEventSmartScroll } from "@web/views/Week/hooks/grid/useDragEventSmartScroll";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { useTimedGridDraftCreation } from "@web/views/Week/hooks/grid/useTimedGridDraftCreation";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";

interface Props {
  children?: (props: MainGridRenderProps) => ReactNode;
  dateCalcs: DateCalcs;
  mainGridElementRef: Ref_Callback;
  mainGridRef: MutableRefObject<HTMLDivElement | null>;
  measurements: Measurements_Grid;
  today: Dayjs;
  timedColumnsElementRef: Ref_Callback;
  weekProps: WeekProps;
}

interface MainGridRenderProps {
  onTimedMouseDown: ReturnType<
    typeof useTimedGridDraftCreation
  >["startTimedDraftCreation"];
  timedEventsLayer: ReactNode;
}

export const MainGrid: FC<Props> = ({
  children,
  dateCalcs,
  mainGridElementRef,
  mainGridRef,
  measurements,
  today,
  timedColumnsElementRef,
  weekProps,
}) => {
  const { component } = weekProps;
  const { weekDays } = component;
  const { startTimedDraftCreation } = useTimedGridDraftCreation({
    dateCalcs,
    weekProps,
  });

  useDragEventSmartScroll(mainGridRef);

  if (children) {
    return (
      <MainGridChildren
        measurements={measurements}
        onTimedMouseDown={startTimedDraftCreation}
        weekProps={weekProps}
      >
        {children}
      </MainGridChildren>
    );
  }

  return (
    <MainGridCalendar
      mainGridElementRef={mainGridElementRef}
      measurements={measurements}
      onTimedMouseDown={startTimedDraftCreation}
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
  onTimedMouseDown: ReturnType<
    typeof useTimedGridDraftCreation
  >["startTimedDraftCreation"];
  weekProps: WeekProps;
}

const MainGridChildren: FC<MainGridChildrenProps> = ({
  children,
  measurements,
  onTimedMouseDown,
  weekProps,
}) => {
  const timedEventsLayer = useMemo(
    () => <MainGridEvents measurements={measurements} weekProps={weekProps} />,
    [measurements, weekProps],
  );

  return (
    <>
      {children({
        onTimedMouseDown,
        timedEventsLayer,
      })}
    </>
  );
};

interface MainGridCalendarProps {
  mainGridElementRef: Ref_Callback;
  measurements: Measurements_Grid;
  onTimedMouseDown: ReturnType<
    typeof useTimedGridDraftCreation
  >["startTimedDraftCreation"];
  timedColumnsElementRef: Ref_Callback;
  today: Dayjs;
  weekDays: Dayjs[];
  weekProps: WeekProps;
}

const MainGridCalendar: FC<MainGridCalendarProps> = ({
  mainGridElementRef,
  measurements,
  onTimedMouseDown,
  timedColumnsElementRef,
  today,
  weekDays,
  weekProps,
}) => {
  const timedEventsLayer = useMemo(
    () => <MainGridEvents measurements={measurements} weekProps={weekProps} />,
    [measurements, weekProps],
  );

  return (
    <CalendarTimedGrid
      eventsLayer={timedEventsLayer}
      onMouseDown={onTimedMouseDown}
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
