import { FC, MouseEvent, MutableRefObject } from "react";
import { Categories_Event } from "@core/types/event.types";
import { Dayjs } from "@core/util/date/dayjs";
import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import { getHourLabels } from "@web/common/utils/datetime/web.date.util";
import { assembleDefaultEvent } from "@web/common/utils/event/event.util";
import { getX } from "@web/common/utils/grid/grid.util";
import { isRightClick } from "@web/common/utils/mouse/mouse.util";
import { selectIsDrafting } from "@web/ducks/events/selectors/draft.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { MainGridColumns } from "@web/views/Calendar/components/Grid//Columns/MainGridColumns";
import { MainGridEvents } from "@web/views/Calendar/components/Grid/MainGrid/MainGridEvents";
import {
  StyledGridRow,
  StyledGridWithTimeLabels,
  StyledMainGrid,
} from "@web/views/Calendar/components/Grid/MainGrid/styled";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { useDragEventSmartScroll } from "@web/views/Calendar/hooks/grid/useDragEventSmartScroll";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { DRAFT_DURATION_MIN } from "@web/views/Calendar/layout.constants";

interface Props {
  dateCalcs: DateCalcs;
  isSidebarOpen: boolean;
  mainGridRef: MutableRefObject<HTMLDivElement | null>;
  measurements: Measurements_Grid;
  today: Dayjs;
  weekProps: WeekProps;
}

export const MainGrid: FC<Props> = ({
  dateCalcs,
  isSidebarOpen,
  mainGridRef,
  measurements,
  today,
  weekProps,
}) => {
  const dispatch = useAppDispatch();
  const { component } = weekProps;
  const { isCurrentWeek, week, weekDays } = component;
  const isDrafting = useAppSelector(selectIsDrafting);

  useDragEventSmartScroll(mainGridRef);

  const onMouseDown = async (e: MouseEvent) => {
    if (isDrafting) {
      dispatch(draftSlice.actions.discard(undefined));
      return;
    }

    if (isRightClick(e)) {
      return;
    }

    await startTimedDraft(e);
  };

  const startTimedDraft = async (e: MouseEvent) => {
    const x = getX(e, isSidebarOpen);
    const _start = dateCalcs.getDateByXY(x, e.clientY, component.startOfView);
    const startDate = _start.format();
    const endDate = _start.add(DRAFT_DURATION_MIN, "minutes").format();
    const category = Categories_Event.TIMED;
    const event = await assembleDefaultEvent(category, startDate, endDate);

    dispatch(
      draftSlice.actions.startResizing({
        category,
        event,
        dateToChange: "endDate",
      }),
    );
  };

  return (
    <StyledMainGrid
      id={ID_GRID_MAIN}
      ref={mainGridRef}
      tabIndex={-1}
      className="overflow-y-auto focus:outline-none"
    >
      <MainGridColumns
        isCurrentWeek={isCurrentWeek}
        today={today}
        week={week}
        weekDays={weekDays}
      />

      <StyledGridWithTimeLabels>
        {getHourLabels().map((dayTime, index) => (
          <StyledGridRow
            key={`${dayTime}-${index}:dayTimes`}
            onMouseDown={onMouseDown}
          />
        ))}
      </StyledGridWithTimeLabels>

      <MainGridEvents measurements={measurements} weekProps={weekProps} />
    </StyledMainGrid>
  );
};
