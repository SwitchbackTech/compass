import { ObjectId } from "bson";
import { useCallback, useMemo } from "react";
import {
  SOMEDAY_MONTH_LIMIT_MSG,
  SOMEDAY_WEEK_LIMIT_MSG,
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
import { DirtyParser } from "@web/common/parsers/dirty.parser";
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
import { showMigrationToast } from "@web/components/PlannerSidebar/draft/hooks/MigrationToast";
import {
  type Setters_Sidebar,
  type State_Sidebar,
} from "@web/components/PlannerSidebar/draft/hooks/useSidebarState";
import { type SomedayInteractionCommitResult } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/adapter/SomedayInteractionAdapter";
import {
  selectDraft,
  selectDraftActivity,
  selectDraftCategory,
  selectIsDrafting,
} from "@web/ducks/events/selectors/draft.selectors";
import {
  selectIsAtMonthlyLimit,
  selectIsAtWeeklyLimit,
} from "@web/ducks/events/selectors/someday.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { type Activity_DraftEvent } from "@web/ducks/events/slices/draft.slice.types";
import {
  createEventSlice,
  deleteEventSlice,
  editEventSlice,
} from "@web/ducks/events/slices/event.slice";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
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
  destination: SomedayDragLocation;
  draggableId: string;
  source: SomedayDragLocation;
}

const getSomedayColumnName = (category: Categories_Event) =>
  category === Categories_Event.SOMEDAY_WEEK ? COLUMN_WEEK : COLUMN_MONTH;

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

export const useSidebarActions = (
  view: SidebarActionViewProps,
  state: State_Sidebar,
  setters: Setters_Sidebar,
) => {
  const dispatch = useAppDispatch();

  const isDrafting = useAppSelector(selectIsDrafting);
  const isAtWeeklyLimit = useAppSelector(selectIsAtWeeklyLimit);
  const isAtMonthlyLimit = useAppSelector(selectIsAtMonthlyLimit);
  const reduxDraft = useAppSelector(selectDraft);
  const draftType = useAppSelector(selectDraftCategory);
  const activity = useAppSelector(selectDraftActivity);

  const isInstance = useMemo((): boolean => {
    return ObjectId.isValid(reduxDraft?.recurrence?.eventId ?? "");
  }, [reduxDraft?.recurrence?.eventId]);

  const { onGoToDate, viewEnd, viewStart } = view;

  const { setDraft, setIsDrafting, setIsSomedayFormOpen, setSomedayEvents } =
    setters;

  const close = () => {
    setIsDrafting(false);
    setDraft(null);

    const isSomeday =
      draftType === Categories_Event.SOMEDAY_WEEK ||
      draftType === Categories_Event.SOMEDAY_MONTH;

    if (state.isDraftingExisting || (state.isDraftingNew && isSomeday)) {
      dispatch(draftSlice.actions.discard(undefined));
    }
  };

  const closeForm = () => {
    setIsSomedayFormOpen(false);
  };

  const openForm = useCallback(() => {
    setIsSomedayFormOpen(true);
  }, [setIsSomedayFormOpen]);

  const convertSomedayToCalendarEvent = useCallback(
    (
      _id: string,
      updates: Pick<Schema_Event, "startDate" | "endDate" | "isAllDay">,
    ) => {
      dispatch(
        getSomedayEventsSlice.actions.convert({
          event: { ...updates, isSomeday: false, _id },
        }),
      );
    },
    [dispatch],
  );

  const create = useCallback(() => {
    setDraft(reduxDraft);
    setIsDrafting(true);
    openForm();
  }, [openForm, reduxDraft, setDraft, setIsDrafting]);

  const discard = useCallback(() => {
    if (state.draft) {
      setDraft(null);
    }

    if (reduxDraft) {
      dispatch(draftSlice.actions.discard(undefined));
    }
  }, [state.draft, reduxDraft, setDraft, dispatch]);

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

    dispatch(
      draftSlice.actions.start({
        activity: "sidebarClick",
        event,
        eventType: category,
      }),
    );
  };

  const discardSomedayInteraction = () => {
    dispatch(draftSlice.actions.discard(undefined));
    close();
  };

  const startSomedayInteraction = (eventId: string | undefined) => {
    if (!eventId) return;

    const existingEvent = state.somedayEvents.events[eventId];

    if (!existingEvent) {
      return;
    }

    dispatch(draftSlice.actions.startDnd(undefined));
    setDraft(existingEvent);
    setIsSomedayFormOpen(false);
    setIsDrafting(true);
  };

  const cancelSomedayInteraction = () => {
    discardSomedayInteraction();
  };

  const commitSomedayInteraction = (result: SomedayInteractionCommitResult) => {
    if (result.type === "schedule") {
      convertSomedayToCalendarEvent(result.eventId, {
        ...result.dates,
        isAllDay: result.isAllDay,
      });
      discardSomedayInteraction();
      return;
    }

    if (result.type === "sidebarDrop") {
      const noChange =
        result.destination.droppableId === result.source.droppableId &&
        result.destination.index === result.source.index;

      if (!noChange) {
        reorderSomedayEvent({
          destination: result.destination,
          draggableId: result.eventId,
          source: result.source,
        });
      }
    }

    discardSomedayInteraction();
  };

  const deleteSomedayEvent = (
    applyTo: RecurringEventUpdateScope = RecurringEventUpdateScope.THIS_EVENT,
  ) => {
    const eventToDelete = state.draft ?? reduxDraft;
    const title = eventToDelete?.title ?? "this event";
    const prefix =
      applyTo === RecurringEventUpdateScope.ALL_EVENTS
        ? "all instances of - "
        : "";

    const confirmed = window.confirm(`Delete ${prefix}${title}?`);

    if (confirmed && eventToDelete?._id) {
      dispatch(
        deleteEventSlice.actions.request({
          _id: eventToDelete._id,
          applyTo,
        }),
      );
    }

    close();
  };

  const duplicateSomedayEvent = () => {
    const eventToDuplicate = state.draft ?? reduxDraft;
    if (!eventToDuplicate) return;

    const { _id: _duplicatedEventId, ...duplicateEvent } =
      MapEvent.removeProviderData(eventToDuplicate);

    dispatch(createEventSlice.actions.request(duplicateEvent));
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
      dispatch(
        editEventSlice.actions.request({
          _id: eventId,
          event: assembleWebEvent(_event),
        }),
      );
    } else {
      dispatch(createEventSlice.actions.request(_event));
    }

    close();
  };

  const createSomedayDraft = async (
    category: Categories_Event,
    activity: Activity_DraftEvent = "sidebarClick",
  ) => {
    if (isDrafting) {
      dispatch(draftSlice.actions.discard(undefined));
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
      dispatch(draftSlice.actions.discard(undefined));
      return;
    }

    const event = (await assembleDefaultEvent(category)) as Schema_Event;

    dispatch(
      draftSlice.actions.start({
        activity,
        eventType: category,
        event,
      }),
    );

    // For keyboard shortcuts, let handleChange() open the form from redux draft.
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
      const recurrenceChanged = reduxDraft
        ? DirtyParser.recurrenceChanged(parsedEvent, reduxDraft)
        : false;

      // For someday events, always use THIS_EVENT scope to allow individual customization
      const applyTo =
        isInstance && recurrenceChanged && !parsedEvent.isSomeday
          ? RecurringEventUpdateScope.ALL_EVENTS
          : RecurringEventUpdateScope.THIS_EVENT;

      dispatch(
        editEventSlice.actions.request({
          _id: eventId,
          event: parsedEvent,
          applyTo,
        }),
      );
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

      dispatch(createEventSlice.actions.request(eventWithOrder));
    }

    close();
  };

  const handleCrossColumnDragging = (
    source: SomedayDragLocation,
    destination: SomedayDragLocation,
    draggableId: string,
  ) => {
    const sourceColumn =
      state.somedayEvents.columns[
        source.droppableId as keyof SomedayEventsColumns
      ];
    const destColumn =
      state.somedayEvents.columns[
        destination.droppableId as keyof SomedayEventsColumns
      ];

    if (
      sourceColumn.id !== destColumn.id &&
      destColumn.id === COLUMN_WEEK &&
      isAtWeeklyLimit
    ) {
      alert(SOMEDAY_WEEK_LIMIT_MSG);
      return;
    }

    if (
      sourceColumn.id !== destColumn.id &&
      destColumn.id === COLUMN_MONTH &&
      isAtMonthlyLimit
    ) {
      alert(SOMEDAY_MONTH_LIMIT_MSG);
      return;
    }

    // Remove from source column
    const sourceEventIds = Array.from(sourceColumn.eventIds);
    sourceEventIds.splice(source.index, 1);

    // Add to destination column
    const destEventIds = Array.from(destColumn.eventIds);
    destEventIds.splice(destination.index, 0, draggableId);

    const newState = {
      ...state.somedayEvents,
      columns: {
        ...state.somedayEvents.columns,
        [sourceColumn.id]: {
          ...sourceColumn,
          eventIds: sourceEventIds,
        },
        [destColumn.id]: {
          ...destColumn,
          eventIds: destEventIds,
        },
      },
    };
    setSomedayEvents(newState);

    let draggedEvent = state.somedayEvents.events[draggableId];

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

    const newOrder = destEventIds.indexOf(draggableId);

    if (!draggedEvent?._id) return;

    draggedEvent.order = newOrder;

    if (!hasEventDates(draggedEvent)) return;

    dispatch(
      editEventSlice.actions.request({
        _id: draggedEvent._id,
        event: assembleWebEvent(draggedEvent),
      }),
    );
  };

  const handleSameColumnReordering = (
    source: SomedayDragLocation,
    destination: SomedayDragLocation,
    draggableId: string,
  ) => {
    const column =
      state.somedayEvents.columns[
        source.droppableId as keyof SomedayEventsColumns
      ];
    const newEventIds = Array.from(column.eventIds);
    newEventIds.splice(source.index, 1);
    newEventIds.splice(destination.index, 0, draggableId);
    const newColumn = {
      ...column,
      eventIds: newEventIds,
    };

    const newState = {
      ...state.somedayEvents,
      columns: {
        ...state.somedayEvents.columns,
        [newColumn.id]: newColumn,
      },
    };

    setSomedayEvents(newState);

    const newOrder = newEventIds.map((_id, index) => ({
      _id,
      order: index,
    }));
    dispatch(getSomedayEventsSlice.actions.reorder(newOrder));
  };

  const reorderSomedayEvent = (result: SomedayReorderResult) => {
    const { destination, source, draggableId } = result;

    if (source.droppableId === destination.droppableId) {
      handleSameColumnReordering(source, destination, draggableId);
    } else {
      handleCrossColumnDragging(source, destination, draggableId);
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
    onSubmit,
    reset,
    setDraft,
    startSomedayInteraction,
  };
};

export type Actions_Sidebar = ReturnType<typeof useSidebarActions>;
