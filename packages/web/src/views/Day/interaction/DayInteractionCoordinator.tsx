import { type FC, type PropsWithChildren, useMemo, useRef } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { type CalendarLayoutCacheSources } from "@web/common/calendar-grid/interaction/calendarLayoutCache";
import { CalendarInteractionPointerCaptureBoundary } from "@web/common/calendar-interaction/react/CalendarInteractionPointerCaptureBoundary";
import { useUpdateEvent } from "@web/common/hooks/useUpdateEvent";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  assembleGridEvent,
  type EventWithDates,
  hasEventDates,
} from "@web/common/utils/event/event.util";
import { selectIsEventFormOpen } from "@web/ducks/events/selectors/draft.selectors";
import {
  selectDayEvents,
  selectTimedDayEvents,
} from "@web/ducks/events/selectors/event.selectors";
import { selectPendingEventIds } from "@web/ducks/events/selectors/pending.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import {
  createDayInteractionAdapter,
  type DayAllDayDragCommitResult,
  type DayAllDayResizeCommitResult,
  type DayInteractionRuntime,
  type DayTimedDragCommitResult,
  type DayTimedResizeCommitResult,
} from "./adapter/DayInteractionAdapter";

interface Props extends PropsWithChildren {
  dateInView: Dayjs;
  getLayoutSources: () => CalendarLayoutCacheSources;
  onOpenEvent: (event: Schema_GridEvent) => void;
}

export const DayInteractionCoordinator: FC<Props> = ({
  children,
  dateInView,
  getLayoutSources,
  onOpenEvent,
}) => {
  const dispatch = useAppDispatch();
  const dayEvents = useAppSelector(selectDayEvents);
  const allDayEvents = useMemo(
    () => getAllDayDayEvents(dayEvents),
    [dayEvents],
  );
  const timedEvents = useAppSelector(selectTimedDayEvents);
  const pendingEventIds = useAppSelector(selectPendingEventIds);
  const updateEvent = useUpdateEvent();
  const isFormOpen = useAppSelector(selectIsEventFormOpen);
  const isFormOpenRef = useRef(isFormOpen);
  isFormOpenRef.current = isFormOpen;
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
  const runtimeRef = useRef<DayInteractionRuntime>({
    getTimedEventById: () => null,
    isEventPending: () => false,
    onClickTimedEvent: () => undefined,
    onCommitTimedDrag: () => undefined,
  });
  const adapter = useMemo(
    () =>
      createDayInteractionAdapter({
        getLayoutSources: () => layoutSourcesRef.current(),
        getVisibleDate: () => dateInView,
        runtime: () => runtimeRef.current,
      }),
    [dateInView],
  );

  layoutSourcesRef.current = getLayoutSources;

  const openDayCalendarEvent = (event: Schema_GridEvent) => {
    if (!event._id) {
      return;
    }

    onOpenEvent(event);
  };

  const commitSavedMutation = (
    result:
      | DayAllDayDragCommitResult
      | DayAllDayResizeCommitResult
      | DayTimedDragCommitResult
      | DayTimedResizeCommitResult,
  ) => {
    if (!result.hasMoved) {
      openDayCalendarEvent(result.event);
      return;
    }

    updateEvent({ event: result.event }, true);
    dispatch(draftSlice.actions.discard(undefined));
  };

  runtimeRef.current = {
    getAllDayEventById: (eventId) => allDayEventsById.get(eventId) ?? null,
    getTimedEventById: (eventId) => timedEventsById.get(eventId) ?? null,
    isEventPending: (eventId) => pendingEventIdSet.has(eventId),
    isFormOpen: () => isFormOpenRef.current,
    onClickAllDayEvent: openDayCalendarEvent,
    onClickTimedEvent: openDayCalendarEvent,
    onCommitAllDayDrag: commitSavedMutation,
    onCommitAllDayResize: commitSavedMutation,
    onCommitTimedDrag: commitSavedMutation,
    onCommitTimedResize: commitSavedMutation,
    onMotionActivation: (target) => {
      if (target.hadFormOpenBeforeInteraction) {
        dispatch(draftSlice.actions.setFormOpen(false));
      }
    },
  };

  return (
    <CalendarInteractionPointerCaptureBoundary adapter={adapter}>
      {children}
    </CalendarInteractionPointerCaptureBoundary>
  );
};

const getAllDayDayEvents = (events: ReturnType<typeof selectDayEvents>) =>
  events
    .filter(
      (event): event is EventWithDates =>
        Boolean(event.isAllDay) && hasEventDates(event),
    )
    .map(assembleGridEvent);

const mapEventsById = (events: Schema_GridEvent[]) => {
  const eventsById = new Map<string, Schema_GridEvent>();

  for (const event of events) {
    if (event._id) {
      eventsById.set(event._id, event);
    }
  }

  return eventsById;
};
