import { type FC, type PropsWithChildren, useMemo, useRef } from "react";
import { type Event } from "@core/types/event.contracts";
import dayjs from "@core/util/date/dayjs";
import { type GridEvent } from "@web/common/types/web.event.types";
import { type GridScheduleDraft } from "@web/events/event-draft.types";
import {
  createGridEventDraftFromGridEvent,
  editGridEventDraft,
  parseGridEventDraft,
  replaceGridDraftSchedule,
  timedGridSchedule,
} from "@web/events/grid-event-draft.adapter";
import { useEventMutations } from "@web/events/mutations/useEventMutations";
import { useWeekEventViewModel } from "@web/events/queries/useWeekEventsQuery";
import { draftActions } from "@web/events/stores/draft.store";
import { PointerCaptureBoundary } from "@web/interaction/react/PointerCaptureBoundary";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { type WeekLayoutCacheSources } from "./adapter/geometry/week-layout.cache";
import {
  createWeekInteractionAdapter,
  type WeekAllDayDragCommitResult,
  type WeekAllDayResizeCommitResult,
  type WeekInteractionRuntime,
  type WeekTimedDragCommitResult,
  type WeekTimedResizeCommitResult,
} from "./adapter/week-interaction.adapter";
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
  const { allDayEvents, events, timedEvents } = useWeekEventViewModel({
    startOfView: weekProps.query.startOfView,
    endOfView: weekProps.query.endOfView,
  });
  const { actions, confirmation, setters, state } = useDraftContext();
  const mutations = useEventMutations();
  const activeInteractionEventRef = useRef<Event | null>(null);
  const layoutSourcesRef = useRef(getLayoutSources);
  const timedEventsById = useMemo(() => {
    return mapEventsById(timedEvents);
  }, [timedEvents]);
  const allDayEventsById = useMemo(() => {
    return mapEventsById(allDayEvents);
  }, [allDayEvents]);
  const eventsById = useMemo(() => {
    const map = new Map<string, Event>();
    for (const event of events) {
      map.set(event.id, event);
    }
    return map;
  }, [events]);
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

  const openClickedGridEvent = (event: GridEvent) => {
    const sourceEvent = event._id ? eventsById.get(event._id) : undefined;
    const draft = createGridEventDraftFromGridEvent(event, sourceEvent);

    if (!draft) {
      return;
    }

    draftActions.startGridDraft({ activity: "gridClick", draft });
  };

  const openTimedEvent = openClickedGridEvent;

  const openAllDayEvent = openClickedGridEvent;

  // Rebuilds the GridEventDraft for a saved event after the modern
  // pointer-capture engine (WeekInteractionAdapter) commits a drag/resize —
  // it operates on GridEvent geometry, so this re-derives the strict
  // draft from the query cache's source Event plus the engine's resulting
  // dates.
  const gridEventDraftFromSavedResult = (event: GridEvent) => {
    const sourceEvent = event._id
      ? resolveInteractionSourceEvent(
          event._id,
          eventsById,
          activeInteractionEventRef.current,
        )
      : undefined;
    const draft = sourceEvent ? editGridEventDraft(sourceEvent, "this") : null;

    if (!draft) return null;

    const schedule: GridScheduleDraft = event.isAllDay
      ? {
          kind: "allDay",
          start: dayjs(event.startDate).toDate(),
          end: dayjs(event.endDate).toDate(),
        }
      : timedGridSchedule(
          dayjs(event.startDate).toDate(),
          dayjs(event.endDate).toDate(),
        );

    return replaceGridDraftSchedule(draft, schedule);
  };

  // Non-recurring saved events skip the Draft confirmation flow entirely and
  // commit straight through the strict mutation. Recurring events (source
  // event carries `recurrence`) still need the scope-confirmation dialog,
  // which lives in useDraftConfirmation (out of scope here) — those keep
  // going through the legacy confirmation.onSubmit path below.
  const commitStrictSavedMutation = (event: GridEvent) => {
    const draft = gridEventDraftFromSavedResult(event);
    if (!draft) return;

    const parsed = parseGridEventDraft(draft);

    if (parsed.ok && parsed.mode === "edit") {
      mutations.replace({ id: parsed.eventId, input: parsed.input });
    }
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
      const draft = gridEventDraftFromSavedResult(result.event);
      if (draft) setters.setDraft(draft);

      actions.openForm();
      return;
    }

    if (result.event.recurrence) {
      const draft = gridEventDraftFromSavedResult(result.event);
      if (draft) void confirmation.onSubmit(draft);
      return;
    }

    commitStrictSavedMutation(result.event);
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
      // Edge navigation replaces the visible query before pointer-up. Retain
      // the canonical source so the destination-week commit can still build
      // its strict mutation input.
      activeInteractionEventRef.current = target.event._id
        ? (eventsById.get(target.event._id) ?? null)
        : null;

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

export const resolveInteractionSourceEvent = (
  eventId: string,
  visibleEventsById: ReadonlyMap<string, Event>,
  activeInteractionEvent: Event | null,
) =>
  visibleEventsById.get(eventId) ??
  (activeInteractionEvent?.id === eventId ? activeInteractionEvent : undefined);
