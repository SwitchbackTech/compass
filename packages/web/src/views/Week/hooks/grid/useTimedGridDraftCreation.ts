import { type MouseEvent as ReactMouseEvent, useEffect, useRef } from "react";
import { type GridEventDraft } from "@web/events/event-draft.types";
import {
  createGridEventDraft,
  replaceGridDraftSchedule,
  timedGridSchedule,
} from "@web/events/grid-event-draft.adapter";
import {
  draftActions,
  selectIsDrafting,
  useDraftStore,
} from "@web/events/stores/draft.store";
import {
  hasExceededCalendarInteractionMoveThreshold,
  isEligibleCalendarInteractionPointerDown,
} from "@web/interaction/calendarInteractionPointer";
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
  const { actions } = useDraftContext();
  const isDrafting = useDraftStore(selectIsDrafting);
  const gestureRef = useRef<TimedDraftCreationGesture | null>(null);

  useEffect(() => {
    return () => {
      gestureRef.current?.cancel();
    };
  }, []);

  const startTimedDraftCreation = (event: ReactMouseEvent<HTMLElement>) => {
    if (isDrafting) {
      draftActions.discard();
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

    const pointerStart = getPointerPoint(event);
    const start = dateCalcs.getDateByXY(
      pointerStart.x,
      pointerStart.y,
      weekProps.component.startOfView,
    );
    const draftEvent = createGridEventDraft(
      timedGridSchedule(
        start.toDate(),
        start.add(DRAFT_DURATION_MIN, "minutes").toDate(),
      ),
    );
    let hasMoved = false;
    let isCancelled = false;
    let isFinished = false;
    let isResizePreviewStarted = false;

    const resolveEventForPointer = ({
      x,
      y,
    }: {
      x: number;
      y: number;
    }): GridEventDraft => {
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

      return replaceGridDraftSchedule(
        draftEvent,
        timedGridSchedule(resolvedStartDate.toDate(), resolvedEndDate.toDate()),
      );
    };

    const cleanup = () => {
      window.removeEventListener("mousemove", handleMouseMove, true);
      window.removeEventListener("mouseup", handleMouseUp, true);
      window.removeEventListener("blur", handleWindowBlur);
      gestureRef.current = null;
    };

    const openTimedDraft = (mouseEvent: MouseEvent) => {
      const nextDraft = resolveEventForPointer(getPointerPoint(mouseEvent));
      if (isCancelled) return;

      actions.stopResizing();
      actions.stopDragging();
      draftActions.startGridDraft({ activity: "gridClick", draft: nextDraft });
    };

    const startResizePreview = (mouseEvent: MouseEvent) => {
      isResizePreviewStarted = true;
      const nextDraft = resolveEventForPointer(getPointerPoint(mouseEvent));
      if (isCancelled || isFinished) return;

      draftActions.startGridDraft({
        activity: "resizing",
        dateToResize: "endDate",
        draft: nextDraft,
      });
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
        draftActions.discard();
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
