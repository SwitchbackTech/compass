import { type FC, type PropsWithChildren, useMemo, useRef } from "react";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { useWeekEventViewModel } from "@web/events/queries/useWeekEventsQuery";
import { draftActions } from "@web/events/stores/draft.store";
import { CalendarInteractionPointerCaptureBoundary } from "@web/interaction/react/CalendarInteractionPointerCaptureBoundary";
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
import { useWeekInteractionLayoutSync } from "./useWeekInteractionLayoutSync";

interface Props extends PropsWithChildren {
  getLayoutSources?: () => WeekLayoutCacheSources;
  weekProps: WeekProps;
}

export const WeekInteractionCoordinator: FC<Props> = ({
  children,
  getLayoutSources,
  weekProps,
}) => {
  const { allDayEvents, timedEvents } = useWeekEventViewModel({
    startOfView: weekProps.component.startOfView,
    endOfView: weekProps.component.endOfView,
  });
  const { actions, confirmation, setters, state } = useDraftContext();
  const layoutSourcesRef = useRef(getLayoutSources);
  const timedEventsById = useMemo(() => {
    return mapEventsById(timedEvents);
  }, [timedEvents]);
  const allDayEventsById = useMemo(() => {
    return mapEventsById(allDayEvents);
  }, [allDayEvents]);
  const runtimeRef = useRef<WeekInteractionRuntime>({
    getTimedEventById: () => null,
    getVisibleDays: () => [],
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
  const visibleDayKeys = useWeekInteractionLayoutSync(adapter, weekProps);

  layoutSourcesRef.current = getLayoutSources;

  const openTimedEvent = (event: Schema_GridEvent) => {
    draftActions.startGridClick(event);
  };

  const openAllDayEvent = (event: Schema_GridEvent) => {
    draftActions.startGridClick(event);
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
    getVisibleDays: () => visibleDayKeys,
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
