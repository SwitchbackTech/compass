import { type FC, type MouseEvent, memo } from "react";
import { useStore } from "react-redux";
import { Categories_Event } from "@core/types/event.types";
import { type Dayjs } from "@core/util/date/dayjs";
import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import { type Ref_Callback } from "@web/common/types/util.types";
import { getHourLabels } from "@web/common/utils/datetime/web.date.util";
import { assembleDefaultEvent } from "@web/common/utils/event/event.util";
import { isRightClick } from "@web/common/utils/mouse/mouse.util";
import { selectIsDrafting } from "@web/ducks/events/selectors/draft.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { type RootState } from "@web/store";
import { useAppDispatch } from "@web/store/store.hooks";
import { MainGridColumns } from "@web/views/Week/components/Grid/Columns/MainGridColumns";
import { MainGridEvents } from "@web/views/Week/components/Grid/MainGrid/MainGridEvents";
import {
  StyledGridRow,
  StyledGridWithTimeLabels,
  StyledMainGrid,
} from "@web/views/Week/components/Grid/MainGrid/styled";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { DRAFT_DURATION_MIN } from "@web/views/Week/layout.constants";

interface Props {
  dateCalcs: DateCalcs;
  mainGridElementRef: Ref_Callback;
  measurements: Measurements_Grid;
  today: Dayjs;
  weekProps: WeekProps;
}

const MainGridBase: FC<Props> = ({
  dateCalcs,
  mainGridElementRef,
  measurements,
  today,
  weekProps,
}) => {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const { component } = weekProps;
  const { isCurrentWeek, week, weekDays } = component;

  const onMouseDown = async (e: MouseEvent) => {
    const isDrafting = selectIsDrafting(store.getState());

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
    const _start = dateCalcs.getDateByXY(
      e.clientX,
      e.clientY,
      component.startOfView,
    );
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
      ref={mainGridElementRef}
      tabIndex={-1}
      className="compass-scroll"
    >
      <MainGridColumns
        isCurrentWeek={isCurrentWeek}
        today={today}
        week={week}
        weekDays={weekDays}
      />

      <StyledGridWithTimeLabels>
        {getHourLabels(true).map((dayTime) => (
          <StyledGridRow key={dayTime} onMouseDown={onMouseDown} />
        ))}
      </StyledGridWithTimeLabels>

      <MainGridEvents measurements={measurements} weekProps={weekProps} />
    </StyledMainGrid>
  );
};

export const MainGrid = memo(MainGridBase, () =>
  Boolean(
    typeof window !== "undefined" && window.__weekInteractionV2MotionActive,
  ),
);
