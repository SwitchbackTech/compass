import { type FC, type MutableRefObject, type ReactNode } from "react";
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

  const timedEventsLayer = (
    <MainGridEvents measurements={measurements} weekProps={weekProps} />
  );

  if (children) {
    return (
      <>
        {children({
          onTimedMouseDown: startTimedDraftCreation,
          timedEventsLayer,
        })}
      </>
    );
  }

  return (
    <CalendarTimedGrid
      eventsLayer={timedEventsLayer}
      onMouseDown={startTimedDraftCreation}
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
