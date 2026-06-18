import {
  type FC,
  type PropsWithChildren,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import {
  SOMEDAY_MONTH_LIMIT_MSG,
  SOMEDAY_WEEK_LIMIT_MSG,
} from "@core/constants/core.constants";
import { MapEvent } from "@core/mappers/map.event";
import { Categories_Event } from "@core/types/event.types";
import { CalendarInteractionPointerCaptureBoundary } from "@web/common/calendar-interaction/react/CalendarInteractionPointerCaptureBoundary";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { getDatesByCategory } from "@web/common/utils/datetime/web.date.util";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import { type SomedaySidebarCommitResult } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/adapter/SomedayInteractionAdapter.types";
import { type Payload_ConvertEvent } from "@web/ducks/events/event.types";
import {
  selectAllDayEvents,
  selectGridEvents,
} from "@web/ducks/events/selectors/event.selectors";
import {
  selectIsAtMonthlyLimit,
  selectIsAtWeeklyLimit,
  selectSomedayMonthCount,
  selectSomedayWeekCount,
} from "@web/ducks/events/selectors/someday.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { type WeekLayoutCacheSources } from "./adapter/geometry/weekLayoutCache";
import {
  createWeekInteractionAdapter,
  type WeekAllDayDragCommitResult,
  type WeekAllDayResizeCommitResult,
  type WeekCalendarToSidebarCommitResult,
  type WeekInteractionRuntime,
  type WeekTimedDragCommitResult,
  type WeekTimedResizeCommitResult,
} from "./adapter/WeekInteractionAdapter";

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
  const isAtMonthlyLimit = useAppSelector(selectIsAtMonthlyLimit);
  const isAtWeeklyLimit = useAppSelector(selectIsAtWeeklyLimit);
  const somedayMonthCount = useAppSelector(selectSomedayMonthCount);
  const somedayWeekCount = useAppSelector(selectSomedayWeekCount);
  const sidebarContext = useSidebarContext(true);
  const { actions, confirmation, setters, state } = useDraftContext();
  const layoutSourcesRef = useRef(getLayoutSources);
  // Tracks an in-flight grid event dragged over the sidebar. `draggedEvent` is
  // stashed at drag start; `sidebarSource` is the synthetic source returned by
  // `startCalendarSidebarDrag` (set once the pointer first enters the sidebar).
  const draggedEventRef = useRef<Schema_GridEvent | null>(null);
  const sidebarSourceRef = useRef<{
    droppableId: string;
    index: number;
  } | null>(null);
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
    dispatch(draftSlice.actions.startGridClick(event));
  };

  const openAllDayEvent = (event: Schema_GridEvent) => {
    dispatch(draftSlice.actions.startGridClick(event));
  };

  // Tears down a sidebar drag that was started (pointer entered the sidebar),
  // whatever the drag's final destination. Safe no-op if never started.
  const endSidebarDrag = () => {
    if (!sidebarSourceRef.current) return;

    sidebarSourceRef.current = null;
    sidebarContext?.actions.cancelSomedayInteraction();
  };

  const commitSavedMutation = (
    result:
      | WeekAllDayDragCommitResult
      | WeekAllDayResizeCommitResult
      | WeekTimedDragCommitResult
      | WeekTimedResizeCommitResult,
  ) => {
    endSidebarDrag();

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

  const commitCalendarToSidebar = (
    result: WeekCalendarToSidebarCommitResult,
  ) => {
    const isWeekDrop = result.category === Categories_Event.SOMEDAY_WEEK;
    const isBlocked = isWeekDrop ? isAtWeeklyLimit : isAtMonthlyLimit;

    if (isBlocked) {
      alert(isWeekDrop ? SOMEDAY_WEEK_LIMIT_MSG : SOMEDAY_MONTH_LIMIT_MSG);
      endSidebarDrag();
      return;
    }

    const { startDate, endDate } = getDatesByCategory(
      result.category,
      weekProps.component.startOfView,
      weekProps.component.endOfView,
    );
    const event: Payload_ConvertEvent["event"] = {
      ...MapEvent.toSomeday(result.event, {
        category: result.category,
        endDate,
        order: isWeekDrop ? somedayWeekCount : somedayMonthCount,
        startDate,
      }),
      _id: result.eventId,
    };

    dispatch(getWeekEventsSlice.actions.convert({ event }));
    endSidebarDrag();
  };

  // Drives the native someday reorder pipeline for a grid event hovering the
  // sidebar: it injects the event into the list on first entry, then reuses the
  // same preview/blocked actions a someday-to-someday drag uses.
  const previewCalendarToSidebar: WeekInteractionRuntime["onPreviewCalendarToSidebar"] =
    (preview) => {
      const sidebarActions = sidebarContext?.actions;
      const draggedEvent = draggedEventRef.current;

      if (!preview || !sidebarActions || !draggedEvent?._id) {
        sidebarActions?.previewSomedaySidebarDrop(null);
        return;
      }

      if (!sidebarSourceRef.current) {
        sidebarSourceRef.current =
          sidebarActions.startCalendarSidebarDrag(draggedEvent);
      }

      if (!sidebarSourceRef.current) return;

      const isWeek = preview.category === Categories_Event.SOMEDAY_WEEK;
      const result: SomedaySidebarCommitResult = {
        destination: {
          droppableId: isWeek ? COLUMN_WEEK : COLUMN_MONTH,
          index: preview.index,
        },
        eventId: draggedEvent._id,
        source: sidebarSourceRef.current,
        type: "sidebarDrop",
      };

      // Use the live redux limits, not the snapshot (which the injected event
      // inflates), to decide whether the destination column is full.
      if (isWeek ? isAtWeeklyLimit : isAtMonthlyLimit) {
        sidebarActions.previewBlockedSomedaySidebarDrop(result);
      } else {
        sidebarActions.previewSomedaySidebarDrop(result);
      }
    };

  runtimeRef.current = {
    getAllDayEventById: (eventId) => allDayEventsById.get(eventId) ?? null,
    getTimedEventById: (eventId) => timedEventsById.get(eventId) ?? null,
    isEventPending: (eventId) => pendingEventIdSet.has(eventId),
    isFormOpen: () => state.isFormOpen,
    onCancelInteraction: endSidebarDrag,
    onClickAllDayEvent: openAllDayEvent,
    onClickTimedEvent: openTimedEvent,
    onCommitAllDayDrag: commitSavedMutation,
    onCommitAllDayResize: commitSavedMutation,
    onCommitCalendarToSidebar: commitCalendarToSidebar,
    onCommitTimedDrag: commitSavedMutation,
    onCommitTimedResize: commitSavedMutation,
    onMotionActivation: (target) => {
      // Reset per-drag sidebar tracking and stash the event for a possible
      // sidebar entry later in this drag.
      draggedEventRef.current = target.event;
      sidebarSourceRef.current = null;

      if (target.hadFormOpenBeforeInteraction) {
        actions.closeForm();
      }
    },
    onPreviewCalendarToSidebar: previewCalendarToSidebar,
    onRequestWeekNavigation: (direction) => {
      if (direction === "prev") {
        weekProps.util.decrementWeek("drag-to-edge");
        return;
      }

      weekProps.util.incrementWeek("drag-to-edge");
    },
  };

  return (
    <CalendarInteractionPointerCaptureBoundary adapter={adapter}>
      {children}
    </CalendarInteractionPointerCaptureBoundary>
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
