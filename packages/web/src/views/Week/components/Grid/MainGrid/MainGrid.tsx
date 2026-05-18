import {
  type FC,
  type MutableRefObject,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Categories_Event } from "@core/types/event.types";
import { type Dayjs } from "@core/util/date/dayjs";
import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import { type Ref_Callback } from "@web/common/types/util.types";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { getHourLabels } from "@web/common/utils/datetime/web.date.util";
import { assembleDefaultEvent } from "@web/common/utils/event/event.util";
import { isRightClick } from "@web/common/utils/mouse/mouse.util";
import { selectIsDrafting } from "@web/ducks/events/selectors/draft.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";
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
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { DRAFT_DURATION_MIN } from "@web/views/Week/layout.constants";

const EMPTY_GRID_DRAG_THRESHOLD_PX = 4;

interface Props {
  dateCalcs: DateCalcs;
  mainGridElementRef: Ref_Callback;
  mainGridRef: MutableRefObject<HTMLDivElement | null>;
  measurements: Measurements_Grid;
  today: Dayjs;
  weekProps: WeekProps;
}

export const MainGrid: FC<Props> = ({
  dateCalcs,
  mainGridElementRef,
  mainGridRef,
  measurements,
  today,
  weekProps,
}) => {
  const dispatch = useAppDispatch();
  const { actions } = useDraftContext();
  const { component } = weekProps;
  const { isCurrentWeek, week, weekDays } = component;
  const isDrafting = useAppSelector(selectIsDrafting);

  useDragEventSmartScroll(mainGridRef);

  const onMouseDown = (e: ReactMouseEvent) => {
    if (isDrafting) {
      dispatch(draftSlice.actions.discard(undefined));
      return;
    }

    if (isRightClick(e)) {
      return;
    }

    startTimedDraftGesture(e);
  };

  const startTimedDraftGesture = (e: ReactMouseEvent) => {
    const initialX = e.clientX;
    const initialY = e.clientY;
    const _start = dateCalcs.getDateByXY(
      initialX,
      initialY,
      component.startOfView,
    );
    const startDate = _start.format();
    const endDate = _start.add(DRAFT_DURATION_MIN, "minutes").format();
    const category = Categories_Event.TIMED;
    const draftEvent = assembleDefaultEvent(category, startDate, endDate);
    let hasMoved = false;
    let isFinished = false;
    let isResizePreviewStarted = false;

    const hasExceededMoveThreshold = (mouseEvent: MouseEvent) =>
      Math.hypot(
        mouseEvent.clientX - initialX,
        mouseEvent.clientY - initialY,
      ) >= EMPTY_GRID_DRAG_THRESHOLD_PX;

    const resolveEventForPointer = async (
      mouseEvent: MouseEvent,
    ): Promise<Schema_GridEvent> => {
      const event = await draftEvent;
      const minimumEndDate = _start.add(DRAFT_DURATION_MIN, "minutes");
      const pointerDate = dateCalcs.getDateByXY(
        mouseEvent.clientX,
        mouseEvent.clientY,
        component.startOfView,
      );
      const resolvedEndDate =
        hasMoved &&
        pointerDate.isSame(_start, "day") &&
        pointerDate.isAfter(minimumEndDate)
          ? pointerDate
          : minimumEndDate;

      return {
        ...event,
        endDate: resolvedEndDate.format(),
      } as Schema_GridEvent;
    };

    const cleanup = () => {
      window.removeEventListener("mousemove", handleMouseMove, true);
      window.removeEventListener("mouseup", handleMouseUp, true);
    };

    const openTimedDraft = (mouseEvent: MouseEvent) => {
      void resolveEventForPointer(mouseEvent).then((event) => {
        actions.stopResizing();
        actions.stopDragging();
        dispatch(
          draftSlice.actions.start({
            activity: "gridClick",
            event,
            eventType: category,
          }),
        );
      });
    };

    const startResizePreview = (mouseEvent: MouseEvent) => {
      isResizePreviewStarted = true;
      void resolveEventForPointer(mouseEvent).then((event) => {
        if (isFinished) {
          return;
        }

        dispatch(
          draftSlice.actions.startResizing({
            category,
            event,
            dateToChange: "endDate",
          }),
        );
      });
    };

    function handleMouseMove(mouseEvent: MouseEvent) {
      if (isFinished) {
        return;
      }

      if (mouseEvent.buttons !== 1) {
        handleMouseUp(mouseEvent);
        return;
      }

      if (!hasMoved && !hasExceededMoveThreshold(mouseEvent)) {
        return;
      }

      hasMoved = true;

      if (!isResizePreviewStarted) {
        startResizePreview(mouseEvent);
      }
    }

    function handleMouseUp(mouseEvent: MouseEvent) {
      if (isFinished) {
        return;
      }

      isFinished = true;
      cleanup();
      mouseEvent.preventDefault();
      mouseEvent.stopPropagation();
      openTimedDraft(mouseEvent);
    }

    window.addEventListener("mousemove", handleMouseMove, true);
    window.addEventListener("mouseup", handleMouseUp, true);
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
