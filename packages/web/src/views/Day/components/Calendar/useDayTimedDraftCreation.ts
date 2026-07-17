import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { type CompassEvent } from "@core/types/compass-event.contracts";
import { type CalendarId, type EventId } from "@core/types/domain-primitives";
import {
  Categories_Event,
  type GridEvent,
} from "@web/common/types/web.event.types";
import {
  addId,
  assembleDefaultEvent,
} from "@web/common/utils/event/event.util";
import {
  createGridEventDraft,
  timedGridSchedule,
} from "@web/events/grid-event-draft.adapter";
import { draftActions } from "@web/events/stores/draft.store";
import { DRAFT_DURATION_MIN } from "@web/grid/grid.constants";
import { type GridCoordinates } from "@web/grid/hooks/useGridCoordinates";
import {
  hasExceededInteractionMoveThreshold,
  isEligibleInteractionPointerDown,
} from "@web/interaction/interaction.pointer";

const TIMED_DRAFT_CREATE_MOVE_THRESHOLD_PX = 4;

interface TimedDraftCreationGesture {
  cancel(): void;
}

export const useDayTimedDraftCreation = ({
  dateCalcs,
  draft,
  onOpenEvent,
}: {
  dateCalcs: GridCoordinates;
  draft: CompassEvent | null;
  onOpenEvent: (event: GridEvent) => void;
}) => {
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
    (
      event: ReactMouseEvent<HTMLElement>,
      calendarId: CalendarId | null = null,
    ) => {
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

      if (draft) {
        draftActions.discard();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      timedDraftCreationGestureRef.current?.cancel();

      const pointerStart = getPointerPoint(event);
      const startDate = dateCalcs.getDateByXY(event.clientX, event.clientY);
      const minimumEndDate = startDate.add(DRAFT_DURATION_MIN, "minutes");
      const draftEvent = assembleDefaultEvent(
        Categories_Event.TIMED,
        startDate.format(),
        minimumEndDate.format(),
      ).then((nextEvent) => addId(nextEvent as GridEvent));
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
          calendarId: calendarId ?? undefined,
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

            // GridEventDraft's clientId keeps the same client-assigned id
            // (from addId, below) across preview updates so
            // dayCalendarDraft.util.ts's isPlaceholder/isActiveDraft matching
            // can recognize this draft before it has a server-issued id.
            const draft = createGridEventDraft(
              timedGridSchedule(
                new Date(nextEvent.startDate),
                new Date(nextEvent.endDate),
              ),
              nextEvent._id as EventId,
              calendarId,
            );

            draftActions.startGridDraft({ activity: "gridClick", draft });
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
          draftActions.discard();
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
          !hasExceededInteractionMoveThreshold(
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
    [dateCalcs, draft, onOpenEvent],
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
