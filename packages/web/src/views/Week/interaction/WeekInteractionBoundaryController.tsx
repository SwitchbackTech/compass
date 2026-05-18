import { type FC, type PropsWithChildren, useMemo, useRef } from "react";
import { Categories_Event } from "@core/types/event.types";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { selectGridEvents } from "@web/ducks/events/selectors/event.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import {
  WeekInteractionAdapter,
  type WeekInteractionRuntime,
  type WeekTimedDragCommitResult,
  type WeekTimedResizeCommitResult,
} from "./WeekInteractionAdapter";
import { WeekInteractionBoundary } from "./WeekInteractionBoundary";

interface Props extends PropsWithChildren {
  weekProps: WeekProps;
}

export const WeekInteractionBoundaryController: FC<Props> = ({
  children,
  weekProps,
}) => {
  const dispatch = useAppDispatch();
  const timedEvents = useAppSelector(selectGridEvents);
  const pendingEventIds = useAppSelector(
    (state) => state.events.pendingEvents.eventIds,
  );
  const { actions, confirmation, setters, state } = useDraftContext();
  const timedEventsById = useMemo(() => {
    const eventsById = new Map<string, Schema_GridEvent>();

    for (const event of timedEvents) {
      if (event._id) {
        eventsById.set(event._id, event);
      }
    }

    return eventsById;
  }, [timedEvents]);
  const runtimeRef = useRef<WeekInteractionRuntime>({
    getTimedEventById: () => null,
    isEventPending: () => false,
    onClickTimedEvent: () => undefined,
    onCommitTimedDrag: () => undefined,
  });
  const adapter = useMemo(
    () =>
      new WeekInteractionAdapter({
        mode: "active",
        runtime: () => runtimeRef.current,
      }),
    [],
  );

  const openTimedEvent = (event: Schema_GridEvent) => {
    dispatch(
      draftSlice.actions.start({
        activity: "gridClick",
        event,
        eventType: Categories_Event.TIMED,
      }),
    );
  };

  const commitTimedMutation = (
    result: WeekTimedDragCommitResult | WeekTimedResizeCommitResult,
  ) => {
    if (!result.hasMoved) {
      openTimedEvent(result.event);
      return;
    }

    if (result.hadFormOpenBeforeInteraction) {
      setters.setDraft(result.event);
      actions.openForm();
      return;
    }

    void confirmation.onSubmit(result.event);
  };

  const commitTimedDrag = (result: WeekTimedDragCommitResult) => {
    commitTimedMutation(result);
  };

  const commitTimedResize = (result: WeekTimedResizeCommitResult) => {
    commitTimedMutation(result);
  };

  runtimeRef.current = {
    getTimedEventById: (eventId) => timedEventsById.get(eventId) ?? null,
    isEventPending: (eventId) => pendingEventIds.includes(eventId),
    isFormOpen: () => state.isFormOpen,
    onClickTimedEvent: openTimedEvent,
    onCommitTimedDrag: commitTimedDrag,
    onCommitTimedResize: commitTimedResize,
    onMotionActivation: (target) => {
      if (target.hadFormOpenBeforeInteraction) {
        actions.closeForm();
      }
    },
    onRequestWeekNavigation: (direction) => {
      if (direction === "prev") {
        weekProps.util.decrementWeek("drag-to-edge");
        return;
      }

      weekProps.util.incrementWeek("drag-to-edge");
    },
  };

  return (
    <WeekInteractionBoundary adapter={adapter}>
      {children}
    </WeekInteractionBoundary>
  );
};
