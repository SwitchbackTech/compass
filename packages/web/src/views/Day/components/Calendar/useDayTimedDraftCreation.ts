import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import { CALENDAR_DRAFT_DURATION_MIN } from "@web/common/calendar-grid/calendarGrid.constants";
import { type CalendarDateCalcs } from "@web/common/calendar-grid/hooks/useCalendarDateCalcs";
import {
  hasExceededCalendarInteractionMoveThreshold,
  isEligibleCalendarInteractionPointerDown,
} from "@web/common/calendar-interaction/calendarInteractionPointer";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  addId,
  assembleDefaultEvent,
} from "@web/common/utils/event/event.util";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch } from "@web/store/store.hooks";

const TIMED_DRAFT_CREATE_MOVE_THRESHOLD_PX = 4;

interface TimedDraftCreationGesture {
  cancel(): void;
}

export const useDayTimedDraftCreation = ({
  dateCalcs,
  draft,
  onOpenEvent,
}: {
  dateCalcs: CalendarDateCalcs;
  draft: Schema_Event | null;
  onOpenEvent: (event: Schema_GridEvent) => void;
}) => {
  const dispatch = useAppDispatch();
  const timedDraftCreationGestureRef = useRef<TimedDraftCreationGesture | null>(
    null,
  );

  useEffect(
    () => () => {
      timedDraftCreationGestureRef.current?.cancel();
    },
    [],
  );

  const startTimedDraftCreation = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
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

      if (draft) {
        dispatch(draftSlice.actions.discard(undefined));
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      timedDraftCreationGestureRef.current?.cancel();

      const pointerStart = getPointerPoint(event);
      const startDate = dateCalcs.getDateByXY(event.clientX, event.clientY);
      const minimumEndDate = startDate.add(
        CALENDAR_DRAFT_DURATION_MIN,
        "minutes",
      );
      const draftEvent = assembleDefaultEvent(
        Categories_Event.TIMED,
        startDate.format(),
        minimumEndDate.format(),
      ).then((nextEvent) => addId(nextEvent as Schema_GridEvent));
      let hasMoved = false;
      let isCancelled = false;
      let isFinished = false;

      const resolveEventForPointer = async ({
        x,
        y,
      }: {
        x: number;
        y: number;
      }) => {
        const nextEvent = await draftEvent;
        const pointerDate = dateCalcs.getDateByXY(x, y);
        const isSameDayDrag = hasMoved && pointerDate.isSame(startDate, "day");
        const isUpwardDrag = isSameDayDrag && pointerDate.isBefore(startDate);
        const isDownwardDragPastMinimum =
          isSameDayDrag && pointerDate.isAfter(minimumEndDate);
        const resolvedStartDate = isUpwardDrag ? pointerDate : startDate;
        const resolvedEndDate = isDownwardDragPastMinimum
          ? pointerDate
          : isUpwardDrag
            ? startDate
            : minimumEndDate;

        return {
          ...nextEvent,
          endDate: resolvedEndDate.format(),
          startDate: resolvedStartDate.format(),
        };
      };

      const cleanup = () => {
        window.removeEventListener("mousemove", handleMouseMove, true);
        window.removeEventListener("mouseup", handleMouseUp, true);
        window.removeEventListener("blur", handleWindowBlur);
        timedDraftCreationGestureRef.current = null;
      };

      const previewTimedDraft = (mouseEvent: MouseEvent) => {
        void resolveEventForPointer(getPointerPoint(mouseEvent)).then(
          (nextEvent) => {
            if (isCancelled || isFinished) {
              return;
            }

            dispatch(draftSlice.actions.startGridClick(nextEvent));
          },
        );
      };

      const openTimedDraft = (mouseEvent: MouseEvent) => {
        void resolveEventForPointer(getPointerPoint(mouseEvent)).then(
          (nextEvent) => {
            if (isCancelled) {
              return;
            }

            onOpenEvent(nextEvent);
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

        if (hasMoved) {
          dispatch(draftSlice.actions.discard(undefined));
        }
      }

      function handleMouseMove(mouseEvent: MouseEvent) {
        if (isFinished || isCancelled) {
          return;
        }

        if (mouseEvent.buttons !== 1) {
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
        previewTimedDraft(mouseEvent);
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
      timedDraftCreationGestureRef.current = { cancel };
    },
    [dateCalcs, dispatch, draft, onOpenEvent],
  );

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
