import { type FC, type PropsWithChildren, useMemo, useRef } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { type GridEvent } from "@web/common/types/web.event.types";
import { useUpdateEvent } from "@web/events/mutations/useUpdateEvent";
import {
  draftActions,
  selectIsEventFormOpen,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { type GridLayoutCacheSources } from "@web/grid/interaction/layout.cache";
import { PointerCaptureBoundary } from "@web/interaction/react/PointerCaptureBoundary";
import {
  createDayInteractionAdapter,
  type DayAllDayDragCommitResult,
  type DayAllDayResizeCommitResult,
  type DayInteractionRuntime,
  type DayTimedDragCommitResult,
  type DayTimedResizeCommitResult,
} from "./adapter/day-interaction.adapter";

interface Props extends PropsWithChildren {
  allDayEvents?: GridEvent[];
  /** Ordered calendar ids of the rendered per-calendar columns. */
  calendarColumnKeys?: string[];
  dateInView: Dayjs;
  getLayoutSources: () => GridLayoutCacheSources;
  onOpenEvent: (event: GridEvent) => void;
  timedEvents?: GridEvent[];
}

const EMPTY_GRID_EVENTS: GridEvent[] = [];
const EMPTY_COLUMN_KEYS: string[] = [];

export const DayInteractionCoordinator: FC<Props> = ({
  allDayEvents = EMPTY_GRID_EVENTS,
  calendarColumnKeys = EMPTY_COLUMN_KEYS,
  children,
  dateInView,
  getLayoutSources,
  onOpenEvent,
  timedEvents = EMPTY_GRID_EVENTS,
}) => {
  const updateEvent = useUpdateEvent();
  const isFormOpen = useDraftStore(selectIsEventFormOpen);
  const isFormOpenRef = useRef(isFormOpen);
  isFormOpenRef.current = isFormOpen;
  const layoutSourcesRef = useRef(getLayoutSources);
  const calendarColumnKeysRef = useRef(calendarColumnKeys);
  calendarColumnKeysRef.current = calendarColumnKeys;
  const timedEventsById = useMemo(() => {
    return mapEventsById(timedEvents);
  }, [timedEvents]);
  const allDayEventsById = useMemo(() => {
    return mapEventsById(allDayEvents);
  }, [allDayEvents]);
  const runtimeRef = useRef<DayInteractionRuntime>({
    getTimedEventById: () => null,
    onClickTimedEvent: () => undefined,
    onCommitTimedDrag: () => undefined,
  });
  const adapter = useMemo(
    () =>
      createDayInteractionAdapter({
        getColumnKeys: () => calendarColumnKeysRef.current,
        getLayoutSources: () => layoutSourcesRef.current(),
        getVisibleDate: () => dateInView,
        runtime: () => runtimeRef.current,
      }),
    [dateInView],
  );

  layoutSourcesRef.current = getLayoutSources;

  const openDayCalendarEvent = (event: GridEvent) => {
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

    updateEvent({ event: result.event }, true, {
      onOptimisticApplied: () => draftActions.discard(),
    });
  };

  runtimeRef.current = {
    getAllDayEventById: (eventId) => allDayEventsById.get(eventId) ?? null,
    getTimedEventById: (eventId) => timedEventsById.get(eventId) ?? null,
    isFormOpen: () => isFormOpenRef.current,
    onClickAllDayEvent: openDayCalendarEvent,
    onClickTimedEvent: openDayCalendarEvent,
    onCommitAllDayDrag: commitSavedMutation,
    onCommitAllDayResize: commitSavedMutation,
    onCommitTimedDrag: commitSavedMutation,
    onCommitTimedResize: commitSavedMutation,
    onMotionActivation: (target) => {
      if (target.hadFormOpenBeforeInteraction) {
        draftActions.setFormOpen(false);
      }
    },
  };

  return (
    <PointerCaptureBoundary adapter={adapter}>
      {children}
    </PointerCaptureBoundary>
  );
};

const mapEventsById = (events: GridEvent[]) => {
  const eventsById = new Map<string, GridEvent>();

  for (const event of events) {
    if (event._id) {
      eventsById.set(event._id, event);
    }
  }

  return eventsById;
};
