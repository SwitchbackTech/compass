import { type MouseEvent as ReactMouseEvent, useEffect, useRef } from "react";
import { type CalendarId, type EventId } from "@core/types/domain-primitives";
import { type Dayjs } from "@core/util/date/dayjs";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
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
import { DRAFT_DURATION_MIN } from "@web/grid/grid.constants";
import {
  hasExceededInteractionMoveThreshold,
  isEligibleInteractionPointerDown,
} from "@web/interaction/interaction.pointer";

const TIMED_DRAFT_CREATE_MOVE_THRESHOLD_PX = 4;

interface TimedDraftCreationGesture {
  cancel(): void;
}

interface UseTimedDraftCreationOptions {
  calendarId?: CalendarId | null;
  finishWhenPrimaryButtonReleased?: boolean;
  getStartDate: (point: { x: number; y: number }) => Dayjs;
  onFinish: (draft: GridEventDraft) => void;
}

export const useTimedDraftCreation = ({
  calendarId = null,
  finishWhenPrimaryButtonReleased = true,
  getStartDate,
  onFinish,
}: UseTimedDraftCreationOptions) => {
  const isDrafting = useDraftStore(selectIsDrafting);
  const gestureRef = useRef<TimedDraftCreationGesture | null>(null);

  useEffect(() => {
    return () => {
      gestureRef.current?.cancel();
    };
  }, []);

  const startTimedDraftCreation = (
    event: ReactMouseEvent<HTMLElement>,
    columnCalendarId: CalendarId | null = calendarId,
  ) => {
    // A plain click elsewhere while a draft is open discards it and starts a
    // fresh one at the new point, rather than swallowing the click: without
    // this, a second click anywhere on the grid did nothing but drop the
    // first draft, which read as a dead click (and lost any typed title).
    if (isDrafting) {
      draftActions.discard();
    }

    if (
      !isEligibleInteractionPointerDown({
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

    event.preventDefault();
    event.stopPropagation();
    gestureRef.current?.cancel();

    const pointerStart = getPointerPoint(event);
    const start = getStartDate(pointerStart);
    const draftEvent = createGridEventDraft(
      timedGridSchedule(
        start.toDate(),
        start.add(DRAFT_DURATION_MIN, "minutes").toDate(),
      ),
      createObjectIdString() as EventId,
      columnCalendarId,
    );
    let hasMoved = false;
    let isCancelled = false;
    let isFinished = false;
    let isPreviewStarted = false;

    const resolveDraftForPointer = (point: { x: number; y: number }) => {
      const minimumEndDate = start.add(DRAFT_DURATION_MIN, "minutes");
      const pointerDate = getStartDate(point);
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
      const nextDraft = resolveDraftForPointer(getPointerPoint(mouseEvent));
      if (isCancelled) {
        return;
      }

      onFinish(nextDraft);
    };

    // The store draft is the preview: both views render it straight from the
    // store while the gesture runs, so every move has to write it.
    const previewDraft = (mouseEvent: MouseEvent) => {
      const nextDraft = resolveDraftForPointer(getPointerPoint(mouseEvent));
      if (isCancelled || isFinished) {
        return;
      }

      if (isPreviewStarted) {
        draftActions.setGridDraft(nextDraft);
        return;
      }

      isPreviewStarted = true;
      draftActions.startGridDraft({ activity: "creating", draft: nextDraft });
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

      if (isPreviewStarted) {
        draftActions.discard();
      }
    }

    function handleMouseMove(mouseEvent: MouseEvent) {
      if (isFinished || isCancelled) {
        return;
      }

      if (mouseEvent.buttons !== 1) {
        if (finishWhenPrimaryButtonReleased) {
          finish(mouseEvent);
        }
        return;
      }

      if (
        !hasMoved &&
        !hasExceededInteractionMoveThreshold(
          getPointerPoint(mouseEvent),
          pointerStart,
          TIMED_DRAFT_CREATE_MOVE_THRESHOLD_PX,
        )
      ) {
        return;
      }

      hasMoved = true;
      previewDraft(mouseEvent);
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
    gestureRef.current = { cancel };
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
