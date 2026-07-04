import { ObjectId } from "bson";
import { useCallback, useMemo, useRef } from "react";
import {
  SOMEDAY_MONTH_LIMIT_MSG,
  SOMEDAY_MONTHLY_LIMIT,
  SOMEDAY_WEEK_LIMIT_MSG,
  SOMEDAY_WEEKLY_LIMIT,
} from "@core/constants/core.constants";
import { MapEvent } from "@core/mappers/map.event";
import {
  Categories_Event,
  type Direction_Migrate,
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { getUserId } from "@web/auth/compass/session/session.util";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import {
  computeCurrentEventDateRange,
  computeRelativeEventDateRange,
  getDatesByCategory,
} from "@web/common/utils/datetime/web.date.util";
import {
  assembleDefaultEvent,
  assembleWebEvent,
  hasEventDates,
} from "@web/common/utils/event/event.util";
import { isEventFormOpen } from "@web/common/utils/form/form.util";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { DirtyParser } from "@web/common/utils/parse/dirty.parser";
import { showMigrationToast } from "@web/components/PlannerSidebar/draft/hooks/MigrationToast";
import {
  type Setters_Sidebar,
  type State_Sidebar,
} from "@web/components/PlannerSidebar/draft/hooks/useSidebarState";
import {
  type SomedayInteractionCommitResult,
  type SomedaySidebarCommitResult,
} from "@web/components/PlannerSidebar/SomedayEventSections/interaction/adapter/SomedayInteractionAdapter.types";
import { useEventMutations } from "@web/events/mutations/useEventMutations";
import { useSomedayEventViewModel } from "@web/events/queries/useSomedayEventsQuery";
import {
  type Activity_DraftEvent,
  draftActions,
  selectDraft,
  selectDraftActivity,
  selectDraftCategory,
  selectIsDrafting,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { parseSomedayEventBeforeSubmit } from "@web/views/Week/components/Draft/hooks/actions/submit.parser";

interface SidebarActionViewProps {
  onGoToDate: (date: Dayjs) => void;
  viewEnd: Dayjs;
  viewStart: Dayjs;
}

interface SomedayEventsColumns {
  [COLUMN_WEEK]: {
    id: string;
    eventIds: string[];
  };
  [COLUMN_MONTH]: {
    id: string;
    eventIds: string[];
  };
}

interface SomedayDragLocation {
  droppableId: string;
  index: number;
}

interface SomedayReorderResult {
  baseEvents?: State_Sidebar["somedayEvents"];
  destination: SomedayDragLocation;
  draggableId: string;
  source: SomedayDragLocation;
}

const getSomedayColumnName = (category: Categories_Event) =>
  category === Categories_Event.SOMEDAY_WEEK ? COLUMN_WEEK : COLUMN_MONTH;

const somedayColumnLimits = {
  [COLUMN_MONTH]: SOMEDAY_MONTHLY_LIMIT,
  [COLUMN_WEEK]: SOMEDAY_WEEKLY_LIMIT,
};

const getNextSomedayOrder = (
  category: Categories_Event,
  somedayEvents: State_Sidebar["somedayEvents"],
) => {
  const columnName = getSomedayColumnName(category);
  const events = somedayEvents.columns[columnName].eventIds
    .map((eventId) => somedayEvents.events[eventId])
    .filter(Boolean);
  const orders = events
    .map((event) => event.order)
    .filter(
      (order): order is number =>
        typeof order === "number" && !Number.isNaN(order),
    );

  if (orders.length === 0) {
    return events.length;
  }

  return Math.max(...orders) + 1;
};

const getSomedaySidebarDropKey = ({
  destination,
  eventId,
  source,
}: SomedaySidebarCommitResult) =>
  `${eventId}:${source.droppableId}:${source.index}->${destination.droppableId}:${destination.index}`;

const getSomedayEventsAfterSidebarDrop = ({
  baseEvents,
  result,
}: {
  baseEvents: State_Sidebar["somedayEvents"];
  result: SomedaySidebarCommitResult;
}) => {
  const sourceColumn =
    baseEvents.columns[result.source.droppableId as keyof SomedayEventsColumns];
  const destinationColumn =
    baseEvents.columns[
      result.destination.droppableId as keyof SomedayEventsColumns
    ];

  if (sourceColumn.id === destinationColumn.id) {
    const eventIds = Array.from(sourceColumn.eventIds);

    eventIds.splice(result.source.index, 1);
    eventIds.splice(result.destination.index, 0, result.eventId);

    return {
      ...baseEvents,
      columns: {
        ...baseEvents.columns,
        [sourceColumn.id]: {
          ...sourceColumn,
          eventIds,
        },
      },
    };
  }

  const sourceEventIds = Array.from(sourceColumn.eventIds);
  const destinationEventIds = Array.from(destinationColumn.eventIds);

  sourceEventIds.splice(result.source.index, 1);
  destinationEventIds.splice(result.destination.index, 0, result.eventId);

  return {
    ...baseEvents,
    columns: {
      ...baseEvents.columns,
      [sourceColumn.id]: {
        ...sourceColumn,
        eventIds: sourceEventIds,
      },
      [destinationColumn.id]: {
        ...destinationColumn,
        eventIds: destinationEventIds,
      },
    },
  };
};

const applySomedayColumnOrder = ({
  eventIds,
  events,
}: {
  eventIds: string[];
  events: State_Sidebar["somedayEvents"]["events"];
}) => {
  const orderedEvents = { ...events };
  const orderUpdates = eventIds.flatMap((eventId, order) => {
    const event = orderedEvents[eventId];

    if (!event) {
      return [];
    }

    orderedEvents[eventId] = {
      ...event,
      order,
    };

    return [{ _id: eventId, order }];
  });

  return {
    events: orderedEvents,
    orderUpdates,
  };
};

export const useSidebarActions = (
  view: SidebarActionViewProps,
  state: State_Sidebar,
  setters: Setters_Sidebar,
) => {
  const eventMutations = useEventMutations();
  const interactionPreviewKeyRef = useRef<string | null>(null);
  const interactionSnapshotRef = useRef<State_Sidebar["somedayEvents"] | null>(
    null,
  );

  const isDrafting = useDraftStore(selectIsDrafting);
  const { isAtMonthlyLimit, isAtWeeklyLimit } = useSomedayEventViewModel(
    view.viewStart,
    view.viewEnd,
  );
  const draft = useDraftStore(selectDraft);
  const draftType = useDraftStore(selectDraftCategory);
  const activity = useDraftStore(selectDraftActivity);

  const isInstance = useMemo((): boolean => {
    return ObjectId.isValid(draft?.recurrence?.eventId ?? "");
  }, [draft?.recurrence?.eventId]);

  const { onGoToDate, viewEnd, viewStart } = view;

  const {
    setBlockedSomedayDropColumn,
    setDraft,
    setIsDrafting,
    setIsSomedayFormOpen,
    setSomedayEvents,
  } = setters;

  const close = () => {
    setIsDrafting(false);
    setDraft(null);

    const isSomeday =
      draftType === Categories_Event.SOMEDAY_WEEK ||
      draftType === Categories_Event.SOMEDAY_MONTH;

    if (state.isDraftingExisting || (state.isDraftingNew && isSomeday)) {
      draftActions.discard();
    }
  };

  const closeForm = () => {
    setIsSomedayFormOpen(false);
  };

  const openForm = useCallback(() => {
    setIsSomedayFormOpen(true);
  }, [setIsSomedayFormOpen]);

  const create = useCallback(() => {
    setDraft(draft);
    setIsDrafting(true);
    openForm();
  }, [openForm, draft, setDraft, setIsDrafting]);

  const discard = useCallback(() => {
    if (state.draft) {
      setDraft(null);
    }

    if (draft) {
      draftActions.discard();
    }
  }, [state.draft, draft, setDraft]);

  const handleChange = useCallback(() => {
    if (activity === "createShortcut") {
      // Only handle someday events in sidebar - other draft types should be handled by DraftProvider
      const isSomedayDraft =
        draftType === Categories_Event.SOMEDAY_WEEK ||
        draftType === Categories_Event.SOMEDAY_MONTH;

      if (isSomedayDraft) {
        create();
      }
    }
  }, [activity, create, draftType]);

  const onDraft = (event: Schema_Event, category: Categories_Event) => {
    setIsDrafting(true);
    setDraft(event);
    setIsSomedayFormOpen(true);

    draftActions.start({
      activity: "sidebarClick",
      event,
      eventType: category,
    });
  };

  const getInteractionSnapshot = () => {
    if (!interactionSnapshotRef.current) {
      interactionSnapshotRef.current = state.somedayEvents;
    }

    return interactionSnapshotRef.current;
  };

  const clearSomedayInteractionPreview = ({
    shouldRestore,
  }: {
    shouldRestore: boolean;
  }) => {
    const snapshot = interactionSnapshotRef.current;

    if (shouldRestore && snapshot) {
      setSomedayEvents(snapshot);
    }

    interactionPreviewKeyRef.current = null;
    interactionSnapshotRef.current = null;
    setBlockedSomedayDropColumn(null);
  };

  const isSomedaySidebarDropAllowed = (result: SomedaySidebarCommitResult) => {
    if (result.source.droppableId === result.destination.droppableId) {
      return true;
    }

    const snapshot = getInteractionSnapshot();
    const destinationColumn =
      snapshot.columns[
        result.destination.droppableId as keyof SomedayEventsColumns
      ];
    const destinationLimit =
      somedayColumnLimits[
        result.destination.droppableId as keyof typeof somedayColumnLimits
      ];

    return destinationColumn.eventIds.length < destinationLimit;
  };

  const previewSomedaySidebarDrop = (
    result: SomedaySidebarCommitResult | null,
  ) => {
    const snapshot = getInteractionSnapshot();

    if (!result) {
      if (interactionPreviewKeyRef.current !== null) {
        setSomedayEvents(snapshot);
      }

      interactionPreviewKeyRef.current = null;
      setBlockedSomedayDropColumn(null);
      return;
    }

    const previewKey = getSomedaySidebarDropKey(result);

    if (previewKey === interactionPreviewKeyRef.current) {
      return;
    }

    interactionPreviewKeyRef.current = previewKey;
    setBlockedSomedayDropColumn(null);
    setSomedayEvents(
      getSomedayEventsAfterSidebarDrop({
        baseEvents: snapshot,
        result,
      }),
    );
  };

  const previewBlockedSomedaySidebarDrop = (
    result: SomedaySidebarCommitResult,
  ) => {
    const snapshot = getInteractionSnapshot();

    if (interactionPreviewKeyRef.current !== null) {
      setSomedayEvents(snapshot);
    }

    interactionPreviewKeyRef.current = null;
    setBlockedSomedayDropColumn(result.destination.droppableId);
  };

  const discardSomedayInteraction = () => {
    draftActions.discard();
    close();
  };

  const startSomedayInteraction = (eventId: string | undefined) => {
    if (!eventId) return;

    const existingEvent = state.somedayEvents.events[eventId];

    if (!existingEvent) {
      return;
    }

    draftActions.startDnd();
    interactionSnapshotRef.current = state.somedayEvents;
    interactionPreviewKeyRef.current = null;
    setBlockedSomedayDropColumn(null);
    setDraft(existingEvent);
    setIsSomedayFormOpen(false);
    setIsDrafting(true);
  };

  const cancelSomedayInteraction = () => {
    clearSomedayInteractionPreview({ shouldRestore: true });
    discardSomedayInteraction();
  };

  const commitSomedayInteraction = (result: SomedayInteractionCommitResult) => {
    if (result.type === "schedule") {
      clearSomedayInteractionPreview({ shouldRestore: true });
      eventMutations.convertToCalendar({
        event: {
          ...result.dates,
          _id: result.eventId,
          isAllDay: result.isAllDay,
          isSomeday: false,
        },
      });
      discardSomedayInteraction();
      return;
    }

    let shouldRestorePreview = result.type === "noop";

    if (result.type === "sidebarDrop") {
      const noChange =
        result.destination.droppableId === result.source.droppableId &&
        result.destination.index === result.source.index;

      shouldRestorePreview = noChange;

      if (!noChange) {
        reorderSomedayEvent({
          destination: result.destination,
          draggableId: result.eventId,
          source: result.source,
          baseEvents: interactionSnapshotRef.current ?? state.somedayEvents,
        });
      }
    }

    clearSomedayInteractionPreview({ shouldRestore: shouldRestorePreview });
    discardSomedayInteraction();
  };

  const deleteSomedayEvent = (
    applyTo: RecurringEventUpdateScope = RecurringEventUpdateScope.THIS_EVENT,
  ) => {
    const eventToDelete = state.draft ?? draft;
    const title = eventToDelete?.title ?? "this event";
    const prefix =
      applyTo === RecurringEventUpdateScope.ALL_EVENTS
        ? "all instances of - "
        : "";

    const confirmed = window.confirm(`Delete ${prefix}${title}?`);

    if (confirmed && eventToDelete?._id) {
      eventMutations.deleteSomeday({ _id: eventToDelete._id, applyTo });
    }

    close();
  };

  const duplicateSomedayEvent = () => {
    const eventToDuplicate = state.draft ?? draft;
    if (!eventToDuplicate) return;

    const { _id: _duplicatedEventId, ...duplicateEvent } =
      MapEvent.removeProviderData(eventToDuplicate);

    eventMutations.create(duplicateEvent);
    close();
  };

  const onMigrate = (
    event: Schema_Event,
    category: Categories_Event,
    direction: Direction_Migrate,
  ) => {
    const weekViewRange = {
      startDate: viewStart.format(),
      endDate: viewEnd.format(),
    };

    let _event: Schema_Event;

    if (direction === "forward" || direction === "back") {
      _event = computeRelativeEventDateRange(
        {
          direction: direction === "forward" ? "next" : "prev",
          duration:
            category === Categories_Event.SOMEDAY_WEEK ? "week" : "month",
        },
        event,
      );
    } else {
      _event = computeCurrentEventDateRange(
        {
          duration: direction === "up" ? "week" : "month",
        },
        event,
        weekViewRange,
      );
    }

    // Show toast only for month migrations
    const isMonthMigration =
      (direction === "forward" || direction === "back") &&
      category === Categories_Event.SOMEDAY_MONTH;

    if (isMonthMigration) {
      // Calculate target month name for toast
      const targetDate = dayjs(_event.startDate);
      const targetMonthName = targetDate.format("MMMM");

      // Show single toast with navigation button
      showMigrationToast(targetMonthName, () => {
        onGoToDate(targetDate.startOf("month"));
      });
    }

    if (_event._id) {
      if (!hasEventDates(_event)) return;

      const eventId = _event._id;
      eventMutations.edit({
        _id: eventId,
        event: assembleWebEvent(_event),
      });
    } else {
      eventMutations.create(_event);
    }

    close();
  };

  const createSomedayDraft = async (
    category: Categories_Event,
    activity: Activity_DraftEvent = "sidebarClick",
  ) => {
    if (isDrafting) {
      draftActions.discard();
      close();
      return;
    }

    if (category === Categories_Event.SOMEDAY_WEEK && isAtWeeklyLimit) {
      alert(SOMEDAY_WEEK_LIMIT_MSG);
      return;
    }

    if (category === Categories_Event.SOMEDAY_MONTH && isAtMonthlyLimit) {
      alert(SOMEDAY_MONTH_LIMIT_MSG);
      return;
    }

    if (isEventFormOpen()) {
      draftActions.discard();
      return;
    }

    const event = (await assembleDefaultEvent(category)) as Schema_Event;

    draftActions.start({
      activity,
      eventType: category,
      event,
    });

    // For keyboard shortcuts, let handleChange() open the form from draft.
    // This keeps shortcut-created drafts on one path.
    if (activity === "createShortcut") {
      return;
    }

    setDraft(event);
    setIsSomedayFormOpen(true);
    setIsDrafting(true);
  };

  const onSubmit = async (
    category: Categories_Event,
    event: Schema_Event | null = state.draft,
  ) => {
    if (!event) return;

    const _event = { ...event };
    // We need to provide it to pass zod validation.
    // Order is already corrected after the event is submitted
    // so its okay to provide any random int (hence -1)
    _event.order = -1;

    if (!_event.startDate || !_event.endDate) {
      // This probably means we are creating a new event, hence why we don't have start/end dates
      const { startDate, endDate } = getDatesByCategory(
        category,
        viewStart,
        viewEnd,
      );
      _event.startDate = startDate;
      _event.endDate = endDate;
    }

    const userId = await getUserId();
    const parsedEvent = parseSomedayEventBeforeSubmit(_event, userId);

    if (parsedEvent._id) {
      const eventId = parsedEvent._id;
      const recurrenceChanged = draft
        ? DirtyParser.recurrenceChanged(parsedEvent, draft)
        : false;

      // For someday events, always use THIS_EVENT scope to allow individual customization
      const applyTo =
        isInstance && recurrenceChanged && !parsedEvent.isSomeday
          ? RecurringEventUpdateScope.ALL_EVENTS
          : RecurringEventUpdateScope.THIS_EVENT;

      eventMutations.edit({ _id: eventId, event: parsedEvent, applyTo });
    } else {
      const columnName = getSomedayColumnName(category);
      const column = state.somedayEvents.columns[columnName];
      const eventId = createObjectIdString();
      const order = getNextSomedayOrder(category, state.somedayEvents);

      const eventWithOrder = {
        ...parsedEvent,
        _id: eventId,
        order,
      };

      setSomedayEvents({
        ...state.somedayEvents,
        columns: {
          ...state.somedayEvents.columns,
          [columnName]: {
            ...column,
            eventIds: [...column.eventIds, eventId],
          },
        },
        events: {
          ...state.somedayEvents.events,
          [eventId]: eventWithOrder,
        },
      });

      eventMutations.create(eventWithOrder);
    }

    close();
  };

  const handleCrossColumnDragging = (
    source: SomedayDragLocation,
    destination: SomedayDragLocation,
    draggableId: string,
    baseEvents: State_Sidebar["somedayEvents"],
  ) => {
    const sourceColumn =
      baseEvents.columns[source.droppableId as keyof SomedayEventsColumns];
    const destColumn =
      baseEvents.columns[destination.droppableId as keyof SomedayEventsColumns];

    if (destColumn.id === COLUMN_WEEK && isAtWeeklyLimit) {
      alert(SOMEDAY_WEEK_LIMIT_MSG);
      return;
    }

    if (destColumn.id === COLUMN_MONTH && isAtMonthlyLimit) {
      alert(SOMEDAY_MONTH_LIMIT_MSG);
      return;
    }

    // Remove from source column
    const sourceEventIds = Array.from(sourceColumn.eventIds);
    sourceEventIds.splice(source.index, 1);

    // Add to destination column
    const destEventIds = Array.from(destColumn.eventIds);
    destEventIds.splice(destination.index, 0, draggableId);

    const sourceOrder = applySomedayColumnOrder({
      eventIds: sourceEventIds,
      events: baseEvents.events,
    });
    const destOrder = applySomedayColumnOrder({
      eventIds: destEventIds,
      events: sourceOrder.events,
    });

    let draggedEvent = destOrder.events[draggableId];

    const draggedToMonthColumn = destColumn.id === COLUMN_MONTH;

    const weekViewRange = {
      startDate: viewStart.format(),
      endDate: viewEnd.format(),
    };
    if (draggedToMonthColumn) {
      draggedEvent = computeCurrentEventDateRange(
        { duration: "month" },
        draggedEvent,
        weekViewRange,
      );
    } else {
      draggedEvent = computeCurrentEventDateRange(
        { duration: "week" },
        draggedEvent,
        weekViewRange,
      );
    }

    if (!draggedEvent?._id) return;

    const draggedEventId = draggedEvent._id;

    if (!hasEventDates(draggedEvent)) return;

    const orderUpdates = [
      ...sourceOrder.orderUpdates,
      ...destOrder.orderUpdates,
    ];

    const newState = {
      ...baseEvents,
      columns: {
        ...baseEvents.columns,
        [sourceColumn.id]: {
          ...sourceColumn,
          eventIds: sourceEventIds,
        },
        [destColumn.id]: {
          ...destColumn,
          eventIds: destEventIds,
        },
      },
      events: {
        ...destOrder.events,
        [draggableId]: draggedEvent,
      },
    };
    setSomedayEvents(newState);
    eventMutations.reorderSomeday(orderUpdates);

    eventMutations.edit({
      _id: draggedEventId,
      event: assembleWebEvent(draggedEvent),
    });
  };

  const handleSameColumnReordering = (
    source: SomedayDragLocation,
    destination: SomedayDragLocation,
    draggableId: string,
    baseEvents: State_Sidebar["somedayEvents"],
  ) => {
    const column =
      baseEvents.columns[source.droppableId as keyof SomedayEventsColumns];
    const newEventIds = Array.from(column.eventIds);
    newEventIds.splice(source.index, 1);
    newEventIds.splice(destination.index, 0, draggableId);
    const newColumn = {
      ...column,
      eventIds: newEventIds,
    };

    const newState = {
      ...baseEvents,
      columns: {
        ...baseEvents.columns,
        [newColumn.id]: newColumn,
      },
    };

    setSomedayEvents(newState);

    const newOrder = newEventIds.map((_id, index) => ({
      _id,
      order: index,
    }));
    eventMutations.reorderSomeday(newOrder);
  };

  const reorderSomedayEvent = (result: SomedayReorderResult) => {
    const {
      baseEvents = state.somedayEvents,
      destination,
      source,
      draggableId,
    } = result;

    if (source.droppableId === destination.droppableId) {
      handleSameColumnReordering(source, destination, draggableId, baseEvents);
    } else {
      handleCrossColumnDragging(source, destination, draggableId, baseEvents);
    }
  };

  const reset = () => {
    setDraft(null);
    setIsSomedayFormOpen(false);
    setIsDrafting(false);
  };

  return {
    close,
    closeForm,
    discard,
    handleChange,
    onDraft,
    onMigrate,
    cancelSomedayInteraction,
    commitSomedayInteraction,
    createSomedayDraft,
    deleteSomedayEvent,
    duplicateSomedayEvent,
    isSomedaySidebarDropAllowed,
    onSubmit,
    previewBlockedSomedaySidebarDrop,
    previewSomedaySidebarDrop,
    reset,
    setDraft,
    startSomedayInteraction,
  };
};

export type Actions_Sidebar = ReturnType<typeof useSidebarActions>;
