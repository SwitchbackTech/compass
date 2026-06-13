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
import { Categories_Event } from "@core/types/event.types";
import { CalendarInteractionPointerCaptureBoundary } from "@web/common/calendar-interaction/react/CalendarInteractionPointerCaptureBoundary";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { assembleSomedayConversionEvent } from "@web/common/utils/event/someday.event.util";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
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

  const commitCalendarToSidebar = (
    result: WeekCalendarToSidebarCommitResult,
  ) => {
    const isWeekDrop = result.category === Categories_Event.SOMEDAY_WEEK;

    if (isWeekDrop && isAtWeeklyLimit) {
      alert(SOMEDAY_WEEK_LIMIT_MSG);
      return;
    }

    if (!isWeekDrop && isAtMonthlyLimit) {
      alert(SOMEDAY_MONTH_LIMIT_MSG);
      return;
    }

    const event: Payload_ConvertEvent["event"] = {
      ...assembleSomedayConversionEvent(result.event, {
        category: result.category,
        order: isWeekDrop ? somedayWeekCount : somedayMonthCount,
        viewEnd: weekProps.component.endOfView,
        viewStart: weekProps.component.startOfView,
      }),
      _id: result.eventId,
    };

    dispatch(getWeekEventsSlice.actions.convert({ event }));
    actions.discard();
  };

  const previewCalendarToSidebar: WeekInteractionRuntime["onPreviewCalendarToSidebar"] =
    (preview) => {
      if (!preview) {
        sidebarContext?.actions.setCalendarSidebarDropPreview(null);
        return;
      }

      const isWeek = preview.category === Categories_Event.SOMEDAY_WEEK;
      // Build the someday-shaped placeholder the list renders while hovering,
      // so existing rows animate to make room. It mirrors what the drop will
      // commit (assembleSomedayConversionEvent is also used at commit time).
      const placeholder = assembleSomedayConversionEvent(preview.event, {
        category: preview.category,
        order: preview.index,
        viewEnd: weekProps.component.endOfView,
        viewStart: weekProps.component.startOfView,
      });

      sidebarContext?.actions.setCalendarSidebarDropPreview({
        column: isWeek ? COLUMN_WEEK : COLUMN_MONTH,
        event: { ...placeholder, _id: preview.event._id! },
        index: preview.index,
        isBlocked: isWeek ? isAtWeeklyLimit : isAtMonthlyLimit,
      });
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
    onCommitCalendarToSidebar: commitCalendarToSidebar,
    onCommitTimedDrag: commitSavedMutation,
    onCommitTimedResize: commitSavedMutation,
    onMotionActivation: (target) => {
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
