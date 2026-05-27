import { type FC, type MutableRefObject } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import { type Ref_Callback } from "@web/common/types/util.types";
import { getHourLabels } from "@web/common/utils/datetime/web.date.util";
import { MainGridColumns } from "@web/views/Week/components/Grid/Columns/MainGridColumns";
import { MainGridEvents } from "@web/views/Week/components/Grid/MainGrid/MainGridEvents";
import {
  StyledGridRow,
  StyledGridWithTimeLabels,
  StyledMainGrid,
} from "@web/views/Week/components/Grid/MainGrid/styled";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import { useDragEventSmartScroll } from "@web/views/Week/hooks/grid/useDragEventSmartScroll";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { useTimedGridDraftCreation } from "@web/views/Week/hooks/grid/useTimedGridDraftCreation";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";

interface Props {
  dateCalcs: DateCalcs;
  mainGridElementRef: Ref_Callback;
  mainGridRef: MutableRefObject<HTMLDivElement | null>;
  measurements: Measurements_Grid;
  today: Dayjs;
  timedColumnsElementRef: Ref_Callback;
  weekProps: WeekProps;
}

export const MainGrid: FC<Props> = ({
  dateCalcs,
  mainGridElementRef,
  mainGridRef,
  measurements,
  today,
  timedColumnsElementRef,
  weekProps,
}) => {
  const { component } = weekProps;
  const { isCurrentWeek, week, weekDays } = component;
  const { startTimedDraftCreation } = useTimedGridDraftCreation({
    dateCalcs,
    weekProps,
  });

  useDragEventSmartScroll(mainGridRef);

  return (
    <StyledMainGrid
      aria-label="Timed events grid"
      id={ID_GRID_MAIN}
      ref={mainGridElementRef}
      role="region"
      tabIndex={-1}
      className="compass-scroll"
    >
      <MainGridColumns
        isCurrentWeek={isCurrentWeek}
        timedColumnsElementRef={timedColumnsElementRef}
        today={today}
        week={week}
        weekDays={weekDays}
      />

      <StyledGridWithTimeLabels>
        {getHourLabels(true).map((dayTime) => (
          <StyledGridRow key={dayTime} onMouseDown={startTimedDraftCreation} />
        ))}
      </StyledGridWithTimeLabels>

      <MainGridEvents measurements={measurements} weekProps={weekProps} />
    </StyledMainGrid>
  );
};
