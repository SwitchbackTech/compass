import {
  type FC,
  type PropsWithChildren,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { Categories_Event } from "@core/types/event.types";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  selectAllDayEvents,
  selectGridEvents,
} from "@web/ducks/events/selectors/event.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { type WeekLayoutCacheSources } from "./adapter/geometry/weekLayoutCache";
import {
  createWeekInteractionAdapter,
  type WeekAllDayDragCommitResult,
  type WeekAllDayResizeCommitResult,
  type WeekInteractionRuntime,
  type WeekTimedDragCommitResult,
  type WeekTimedResizeCommitResult,
} from "./adapter/WeekInteractionAdapter";
import { WeekPointerCaptureBoundary } from "./WeekPointerCaptureBoundary";

interface Props extends PropsWithChildren {
  getLayoutSources?: () => WeekLayoutCacheSources;
  weekProps: WeekProps;
}

export const WeekInteractionCoordinator: FC<Props> = ({
  children,
  getLayoutSources,
  weekProps,
}) => {
  const dispatch = useAppDispatch();
  const allDayEvents = useAppSelector(selectAllDayEvents);
  const timedEvents = useAppSelector(selectGridEvents);
  const pendingEventIds = useAppSelector(
    (state) => state.events.pendingEvents.eventIds,
  );
  const { actions, confirmation, setters, state } = useDraftContext();
  const layoutSourcesRef = useRef(getLayoutSources);
  const timedEventsById = useMemo(() => {
    return mapEventsById(timedEvents);
  }, [timedEvents]);
  const allDayEventsById = useMemo(() => {
    return mapEventsById(allDayEvents);
  }, [allDayEvents]);
  const pendingEventIdSet = useMemo(
    () => new Set(pendingEventIds),
    [pendingEventIds],
  );
  const runtimeRef = useRef<WeekInteractionRuntime>({
    getTimedEventById: () => null,
    isEventPending: () => false,
    onClickTimedEvent: () => undefined,
    onCommitTimedDrag: () => undefined,
  });
  const adapter = useMemo(
    () =>
      createWeekInteractionAdapter({
        getLayoutSources: () => layoutSourcesRef.current?.() ?? {},
        runtime: () => runtimeRef.current,
      }),
    [],
  );
  const lastNavigationSource = weekProps.util.getLastNavigationSource();
  const renderedWeekStartMs = weekProps.component.startOfView.valueOf();

  layoutSourcesRef.current = getLayoutSources;

  useLayoutEffect(() => {
    if (
      lastNavigationSource !== "drag-to-edge" ||
      !Number.isFinite(renderedWeekStartMs)
    ) {
      return;
    }

    adapter.rebuildLayoutAfterNavigation();
  }, [adapter, lastNavigationSource, renderedWeekStartMs]);

  const openTimedEvent = (event: Schema_GridEvent) => {
    dispatch(
      draftSlice.actions.start({
        activity: "gridClick",
        event,
        eventType: Categories_Event.TIMED,
      }),
    );
  };

  const openAllDayEvent = (event: Schema_GridEvent) => {
    dispatch(
      draftSlice.actions.start({
        activity: "gridClick",
        event,
        eventType: Categories_Event.ALLDAY,
      }),
    );
  };

  const commitSavedMutation = (
    result:
      | WeekAllDayDragCommitResult
      | WeekAllDayResizeCommitResult
      | WeekTimedDragCommitResult
      | WeekTimedResizeCommitResult,
  ) => {
    if (!result.hasMoved) {
      if (result.event.isAllDay) {
        openAllDayEvent(result.event);
      } else {
        openTimedEvent(result.event);
      }
      return;
    }

    if (result.hadFormOpenBeforeInteraction) {
      setters.setDraft(result.event);
      actions.openForm();
      return;
    }

    void confirmation.onSubmit(result.event);
  };

  runtimeRef.current = {
    getAllDayEventById: (eventId) => allDayEventsById.get(eventId) ?? null,
    getTimedEventById: (eventId) => timedEventsById.get(eventId) ?? null,
    isEventPending: (eventId) => pendingEventIdSet.has(eventId),
    isFormOpen: () => state.isFormOpen,
    onClickAllDayEvent: openAllDayEvent,
    onClickTimedEvent: openTimedEvent,
    onCommitAllDayDrag: commitSavedMutation,
    onCommitAllDayResize: commitSavedMutation,
    onCommitTimedDrag: commitSavedMutation,
    onCommitTimedResize: commitSavedMutation,
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
    <WeekPointerCaptureBoundary adapter={adapter}>
      {children}
    </WeekPointerCaptureBoundary>
  );
};

const mapEventsById = (events: Schema_GridEvent[]) => {
  const eventsById = new Map<string, Schema_GridEvent>();

  for (const event of events) {
    if (event._id) {
      eventsById.set(event._id, event);
    }
  }

  return eventsById;
};
