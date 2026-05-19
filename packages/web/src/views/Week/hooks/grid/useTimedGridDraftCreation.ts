import { type MouseEvent as ReactMouseEvent, useEffect, useRef } from "react";
import { Categories_Event } from "@core/types/event.types";
import {
  hasExceededCalendarInteractionMoveThreshold,
  isEligibleCalendarInteractionPointerDown,
} from "@web/common/calendar-interaction/calendarInteractionPointer";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { assembleDefaultEvent } from "@web/common/utils/event/event.util";
import { selectIsDrafting } from "@web/ducks/events/selectors/draft.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";
import { DRAFT_DURATION_MIN } from "@web/views/Week/layout.constants";
import { type WeekProps } from "../useWeek";
import { type DateCalcs } from "./useDateCalcs";

const TIMED_DRAFT_CREATE_MOVE_THRESHOLD_PX = 4;

interface TimedDraftCreationGesture {
  cancel(): void;
}

export const useTimedGridDraftCreation = ({
  dateCalcs,
  weekProps,
}: {
  dateCalcs: DateCalcs;
  weekProps: WeekProps;
}) => {
  const dispatch = useAppDispatch();
  const { actions } = useDraftContext();
  const isDrafting = useAppSelector(selectIsDrafting);
  const gestureRef = useRef<TimedDraftCreationGesture | null>(null);

  useEffect(() => {
    return () => {
      gestureRef.current?.cancel();
    };
  }, []);

  const startTimedDraftCreation = (event: ReactMouseEvent<HTMLElement>) => {
    if (isDrafting) {
      dispatch(draftSlice.actions.discard(undefined));
      return;
    }

    if (
      !isEligibleCalendarInteractionPointerDown({
        altKey: event.altKey,
        button: event.button,
        ctrlKey: event.ctrlKey,
        isPrimary: true,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
      })
    ) {
      return;
    }

    gestureRef.current?.cancel();

    const category = Categories_Event.TIMED;
    const pointerStart = getPointerPoint(event);
    const start = dateCalcs.getDateByXY(
      pointerStart.x,
      pointerStart.y,
      weekProps.component.startOfView,
    );
    const draftEvent = assembleDefaultEvent(
      category,
      start.format(),
      start.add(DRAFT_DURATION_MIN, "minutes").format(),
    );
    let hasMoved = false;
    let isCancelled = false;
    let isFinished = false;
    let isResizePreviewStarted = false;

    const resolveEventForPointer = async ({
      x,
      y,
    }: {
      x: number;
      y: number;
    }): Promise<Schema_GridEvent> => {
      const event = await draftEvent;
      const minimumEndDate = start.add(DRAFT_DURATION_MIN, "minutes");
      const pointerDate = dateCalcs.getDateByXY(
        x,
        y,
        weekProps.component.startOfView,
      );
      const isSameDayDrag = hasMoved && pointerDate.isSame(start, "day");
      const isUpwardDrag = isSameDayDrag && pointerDate.isBefore(start);
      const isDownwardDragPastMinimum =
        isSameDayDrag && pointerDate.isAfter(minimumEndDate);
      const resolvedStartDate = isUpwardDrag ? pointerDate : start;
      const resolvedEndDate = isDownwardDragPastMinimum
        ? pointerDate
        : isUpwardDrag
          ? start
          : minimumEndDate;

      return {
        ...event,
        endDate: resolvedEndDate.format(),
        startDate: resolvedStartDate.format(),
      } as Schema_GridEvent;
    };

    const cleanup = () => {
      window.removeEventListener("mousemove", handleMouseMove, true);
      window.removeEventListener("mouseup", handleMouseUp, true);
      window.removeEventListener("blur", handleWindowBlur);
      gestureRef.current = null;
    };

    const openTimedDraft = (mouseEvent: MouseEvent) => {
      void resolveEventForPointer(getPointerPoint(mouseEvent)).then(
        (nextEvent) => {
          if (isCancelled) {
            return;
          }

          actions.stopResizing();
          actions.stopDragging();
          dispatch(
            draftSlice.actions.start({
              activity: "gridClick",
              event: nextEvent,
              eventType: category,
            }),
          );
        },
      );
    };

    const startResizePreview = (mouseEvent: MouseEvent) => {
      isResizePreviewStarted = true;
      void resolveEventForPointer(getPointerPoint(mouseEvent)).then(
        (nextEvent) => {
          if (isCancelled || isFinished) {
            return;
          }

          dispatch(
            draftSlice.actions.startResizing({
              category,
              dateToChange: "endDate",
              event: nextEvent,
            }),
          );
        },
      );
    };

    function finish(mouseEvent: MouseEvent) {
      if (isFinished || isCancelled) {
        return;
      }

      isFinished = true;
      cleanup();
      mouseEvent.preventDefault();
      mouseEvent.stopPropagation();
      openTimedDraft(mouseEvent);
    }

    function cancel() {
      if (isFinished || isCancelled) {
        return;
      }

      isCancelled = true;
      cleanup();

      if (isResizePreviewStarted) {
        actions.stopResizing();
        actions.stopDragging();
        dispatch(draftSlice.actions.discard(undefined));
      }
    }

    function handleMouseMove(mouseEvent: MouseEvent) {
      if (isFinished || isCancelled) {
        return;
      }

      if (mouseEvent.buttons !== 1) {
        finish(mouseEvent);
        return;
      }

      if (
        !hasMoved &&
        !hasExceededCalendarInteractionMoveThreshold(
          getPointerPoint(mouseEvent),
          pointerStart,
          TIMED_DRAFT_CREATE_MOVE_THRESHOLD_PX,
        )
      ) {
        return;
      }

      hasMoved = true;

      if (!isResizePreviewStarted) {
        startResizePreview(mouseEvent);
      }
    }

    function handleMouseUp(mouseEvent: MouseEvent) {
      finish(mouseEvent);
    }

    function handleWindowBlur() {
      cancel();
    }

    window.addEventListener("mousemove", handleMouseMove, true);
    window.addEventListener("mouseup", handleMouseUp, true);
    window.addEventListener("blur", handleWindowBlur);

    gestureRef.current = {
      cancel,
    };
  };

  return {
    startTimedDraftCreation,
  };
};

const getPointerPoint = ({
  clientX,
  clientY,
}: {
  clientX: number;
  clientY: number;
}) => ({
  x: clientX,
  y: clientY,
});
