import { ObjectId } from "bson";
import { useCallback, useMemo, useRef } from "react";
import {
  Priorities,
  SOMEDAY_MONTH_LIMIT_MSG,
  SOMEDAY_MONTHLY_LIMIT,
  SOMEDAY_WEEK_LIMIT_MSG,
  SOMEDAY_WEEKLY_LIMIT,
} from "@core/constants/core.constants";
import { type EventId, EventIdSchema } from "@core/types/domain-primitives";
import { type Event } from "@core/types/event.contracts";
import {
  Categories_Event,
  type Direction_Migrate,
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { type ReorderEventsInput } from "@core/types/event-command.contracts";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { getUserId } from "@web/auth/compass/session/session.util";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { getDefaultTargetCalendar } from "@web/calendars/calendar.util";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import {
  computeCurrentEventDateRange,
  computeRelativeEventDateRange,
  getDatesByCategory,
} from "@web/common/utils/datetime/web.date.util";
import {
  assembleDefaultEvent,
  hasEventDates,
} from "@web/common/utils/event/event.util";
import { schemaEventToLocalEvent } from "@web/common/utils/event/someday.event.util";
import { isEventFormOpen } from "@web/common/utils/form/form.util";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { DirtyParser } from "@web/common/utils/parse/dirty.parser";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { showMigrationToast } from "@web/components/PlannerSidebar/draft/hooks/MigrationToast";
import {
  type Setters_Sidebar,
  type State_Sidebar,
} from "@web/components/PlannerSidebar/draft/hooks/useSidebarState";
import {
  type SomedayInteractionCommitResult,
  type SomedaySidebarCommitResult,
} from "@web/components/PlannerSidebar/SomedayEventSections/interaction/adapter/SomedayInteractionAdapter.types";
import { parseEventDraft } from "@web/events/event-draft.parser";
import { useEventMutations } from "@web/events/mutations/useEventMutations";
import { useSomedayEventViewModel } from "@web/events/queries/useSomedayEventsQuery";
import { toRecurrenceScope } from "@web/events/recurrence/recurrence-scope";
import {
  createSomedayEventDraft,
  duplicateSomedayEventDraft,
  editSomedayEventDraft,
  eventToSchemaEvent,
  retargetSomedayEventDraft,
  scheduleSomedayEventTransition,
} from "@web/events/someday-event-draft.adapter";
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
    .filter((event): event is Event => Boolean(event));
  const orders = events
    .map((event) =>
      event.schedule.kind === "someday" ? event.schedule.sortOrder : undefined,
    )
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

    if (!event || event.schedule.kind !== "someday") {
      return [];
    }

    orderedEvents[eventId] = {
      ...event,
      schedule: { ...event.schedule, sortOrder: order },
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
  const mutations = useEventMutations();
  const { data: calendars } = useCalendarsQuery();
  const calendarId = getDefaultTargetCalendar(calendars ?? [])?.id;
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
    setDraft(draft ? schemaEventToLocalEvent(draft, calendarId ?? "") : null);
    setIsDrafting(true);
    openForm();
  }, [openForm, draft, calendarId, setDraft, setIsDrafting]);

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

  // NOT converted to GridEventDraft/editGridEventDraft: onDraft only opens
  // someday events (see SomedayEventContainer/SomedayInteractionCoordinator
  // call sites), and editGridEventDraft explicitly rejects "someday"
  // schedules. See packet-03-phase-3c scoping note. Kept Schema_Event-typed:
  // ContextMenuItems.tsx (the grid right-click menu) also calls this with a
  // Schema_GridEvent, outside this packet's someday-sidebar file set.
  const onDraft = (event: Schema_Event, category: Categories_Event) => {
    setIsDrafting(true);
    setDraft(schemaEventToLocalEvent(event, calendarId ?? ""));
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

      const id = EventIdSchema.safeParse(result.eventId);
      const input = calendarId
        ? scheduleSomedayEventTransition(
            result.dates,
            result.isAllDay,
            calendarId,
          )
        : null;

      if (id.success && input) {
        mutations.transition({ id: id.data, input });
      }

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
    // No confirmation prompt: deletes are undoable via Cmd/Ctrl+Z
    const eventIdToDelete = state.draft?.id ?? draft?._id;
    const id = eventIdToDelete
      ? EventIdSchema.safeParse(eventIdToDelete)
      : null;

    if (id?.success) {
      mutations.delete({ id: id.data, scope: toRecurrenceScope(applyTo) });
    }

    close();
  };

  const duplicateSomedayEvent = () => {
    const eventToDuplicate: Event | null = state.draft
      ? state.draft
      : draft
        ? schemaEventToLocalEvent(draft, calendarId ?? "")
        : null;

    const somedayDraft =
      eventToDuplicate && calendarId
        ? duplicateSomedayEventDraft(eventToDuplicate)
        : null;

    if (somedayDraft && calendarId) {
      const result = parseEventDraft({
        ...somedayDraft,
        values: { ...somedayDraft.values, calendarId },
      });

      if (result.ok && result.mode === "create") {
        mutations.create(result.input);
      }
    }

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

      const idResult = EventIdSchema.safeParse(_event._id);
      const existingEvent = idResult.success
        ? state.somedayEvents.events[idResult.data]
        : undefined;

      if (idResult.success && existingEvent?.schedule.kind === "someday") {
        const editDraft = editSomedayEventDraft(existingEvent);
        const period =
          direction === "up"
            ? "week"
            : direction === "down"
              ? "month"
              : category === Categories_Event.SOMEDAY_WEEK
                ? "week"
                : "month";

        if (editDraft) {
          const retargeted = retargetSomedayEventDraft(editDraft, {
            period,
            anchorDate: dayjs(_event.startDate).toDate(),
            sortOrder: existingEvent.schedule.sortOrder,
          });
          const result = parseEventDraft(retargeted);

          if (result.ok && result.mode === "edit") {
            mutations.replace({ id: result.eventId, input: result.input });
          }
        }
      }
    } else if (calendarId && hasEventDates(_event)) {
      // Create-fallback: migrating a not-yet-persisted someday draft (no
      // _id) just needs a fresh create at the retargeted period/anchorDate,
      // mirroring onSubmit's create branch below.
      const period =
        direction === "up"
          ? "week"
          : direction === "down"
            ? "month"
            : category === Categories_Event.SOMEDAY_WEEK
              ? "week"
              : "month";

      const somedayDraft = createSomedayEventDraft(
        period,
        dayjs(_event.startDate).toDate(),
        _event.order ?? 0,
      );

      const result = parseEventDraft({
        ...somedayDraft,
        values: {
          ...somedayDraft.values,
          title: _event.title ?? "",
          description: _event.description ?? "",
          priority: _event.priority ?? Priorities.UNASSIGNED,
          calendarId,
        },
      });

      if (result.ok && result.mode === "create") {
        mutations.create(result.input);
      }
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
      showErrorToast(SOMEDAY_WEEK_LIMIT_MSG);
      return;
    }

    if (category === Categories_Event.SOMEDAY_MONTH && isAtMonthlyLimit) {
      showErrorToast(SOMEDAY_MONTH_LIMIT_MSG);
      return;
    }

    if (isEventFormOpen()) {
      draftActions.discard();
      return;
    }

    const event = (await assembleDefaultEvent(category)) as Schema_Event;

    // NOT converted to GridEventDraft/createGridEventDraft: `category` is
    // always SOMEDAY_WEEK/SOMEDAY_MONTH here (see the limit checks above),
    // and GridScheduleDraft only models "timed" | "allDay" schedules. See
    // packet-03-phase-3c scoping note.
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

    setDraft(schemaEventToLocalEvent(event, calendarId ?? ""));
    setIsSomedayFormOpen(true);
    setIsDrafting(true);
  };

  const onSubmit = async (
    category: Categories_Event,
    event: Schema_Event | null = state.draft
      ? eventToSchemaEvent(state.draft)
      : null,
  ) => {
    if (!event) return;

    const _event = { ...event };
    // New drafts have no sortOrder yet; a placeholder passes the legacy
    // validator here and the real (nonnegative) order is computed below once
    // we know the target column, then overwrites this on the create payload.
    // Edits already carry their real sortOrder (from the cached event) and
    // must keep it: SortOrderSchema on the new ReplaceEventInput contract
    // rejects negative values, so forcing -1 here made every someday edit's
    // schemaEventToReplaceInput parse fail silently (mutations.replace never
    // fired, so the sidebar kept showing the pre-edit event).
    if (typeof _event.order !== "number" || Number.isNaN(_event.order)) {
      _event.order = -1;
    }

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

      const idResult = EventIdSchema.safeParse(eventId);
      const existingEvent = idResult.success
        ? state.somedayEvents.events[idResult.data]
        : undefined;
      const existingSchedule = existingEvent?.schedule;
      const editDraft =
        existingEvent && existingSchedule?.kind === "someday"
          ? editSomedayEventDraft(existingEvent, toRecurrenceScope(applyTo))
          : null;

      if (editDraft && existingSchedule?.kind === "someday") {
        const rule = parsedEvent.recurrence?.rule;
        const recurrence =
          Array.isArray(rule) && rule.length > 0
            ? { kind: "series" as const, rules: rule }
            : { kind: "single" as const };

        const result = parseEventDraft({
          ...editDraft,
          values: {
            ...editDraft.values,
            title: parsedEvent.title ?? "",
            description: parsedEvent.description ?? "",
            priority: parsedEvent.priority ?? editDraft.values.priority,
            schedule: {
              kind: "someday",
              period: existingSchedule.period,
              // dayjs (not `new Date`) parses a bare "YYYY-MM-DD" string as
              // local midnight; `new Date` parses it as UTC midnight, which
              // reads back as the previous local day in a negative-offset
              // zone once parseEventDraft reformats it — silently dropping
              // the edited event into the prior week/month's bucket.
              anchorDate: parsedEvent.startDate
                ? dayjs(parsedEvent.startDate).toDate()
                : dayjs(existingSchedule.anchorDate).toDate(),
              sortOrder: parsedEvent.order ?? existingSchedule.sortOrder,
            },
            recurrence,
          },
        });

        if (result.ok && result.mode === "edit") {
          mutations.replace({ id: result.eventId, input: result.input });
        }
      }
    } else {
      const columnName = getSomedayColumnName(category);
      const column = state.somedayEvents.columns[columnName];
      const eventId = createObjectIdString() as EventId;
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
          [eventId]: schemaEventToLocalEvent(eventWithOrder, calendarId ?? ""),
        },
      });

      if (calendarId) {
        const somedayDraft = createSomedayEventDraft(
          category === Categories_Event.SOMEDAY_WEEK ? "week" : "month",
          dayjs(parsedEvent.startDate).toDate(),
          order,
        );

        const result = parseEventDraft({
          ...somedayDraft,
          values: {
            ...somedayDraft.values,
            title: parsedEvent.title ?? "",
            description: parsedEvent.description ?? "",
            priority: parsedEvent.priority,
            calendarId,
          },
        });

        if (result.ok && result.mode === "create") {
          mutations.create({ ...result.input, id: eventId });
        }
      }
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
      showErrorToast(SOMEDAY_WEEK_LIMIT_MSG);
      return;
    }

    if (destColumn.id === COLUMN_MONTH && isAtMonthlyLimit) {
      showErrorToast(SOMEDAY_MONTH_LIMIT_MSG);
      return;
    }

    const draggedEvent = baseEvents.events[draggableId];

    if (!draggedEvent || draggedEvent.schedule.kind !== "someday") return;

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

    const draggedSortOrder = destOrder.orderUpdates.find(
      ({ _id }) => _id === draggableId,
    )?.order;

    if (draggedSortOrder === undefined) return;

    const editDraft = editSomedayEventDraft(draggedEvent);

    if (!editDraft) return;

    const destPeriod = destColumn.id === COLUMN_MONTH ? "month" : "week";
    // viewStart is already a local-zone Dayjs; deriving anchorDate from it
    // directly (rather than round-tripping through a formatted string and
    // reparsing) sidesteps the UTC-midnight parsing bug prior phases hit.
    const anchorDate =
      destPeriod === "month"
        ? viewStart.startOf("month").toDate()
        : viewStart.toDate();

    const retargeted = retargetSomedayEventDraft(editDraft, {
      period: destPeriod,
      anchorDate,
      sortOrder: draggedSortOrder,
    });
    const result = parseEventDraft(retargeted);

    if (!result.ok || result.mode !== "edit") return;

    const updatedDraggedEvent: Event = {
      ...draggedEvent,
      schedule: result.input.schedule,
    };

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
        [draggableId]: updatedDraggedEvent,
      },
    };
    setSomedayEvents(newState);

    // The dragged event's own period/anchorDate/sortOrder move through the
    // replace call below, not a reorder call: its someday.period is still
    // the old value server-side until that replace lands, and reorderSomeday
    // isn't sequenced against other mutations, so folding it into either
    // column's reorder items here could race the backend's per-item
    // period-match check. Excluding it keeps every reorder item's period
    // already correct server-side, independent of call order.
    const sourcePeriod = sourceColumn.id === COLUMN_MONTH ? "month" : "week";
    const sourceItems = sourceOrder.orderUpdates.map(({ _id, order }) => ({
      eventId: _id as EventId,
      sortOrder: order,
    }));
    const destItems = destOrder.orderUpdates
      .filter(({ _id }) => _id !== draggableId)
      .map(({ _id, order }) => ({ eventId: _id as EventId, sortOrder: order }));

    if (sourceItems.length > 0) {
      mutations.reorderSomeday({ period: sourcePeriod, items: sourceItems });
    }

    if (destItems.length > 0) {
      mutations.reorderSomeday({ period: destPeriod, items: destItems });
    }

    mutations.replace({ id: result.eventId, input: result.input });
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

    const period = newColumn.id === COLUMN_WEEK ? "week" : "month";
    const items = newEventIds.reduce<ReorderEventsInput["items"]>(
      (acc, eventId, sortOrder) => {
        const id = EventIdSchema.safeParse(eventId);
        if (id.success) acc.push({ eventId: id.data, sortOrder });
        return acc;
      },
      [],
    );

    if (items.length > 0) {
      mutations.reorderSomeday({ period, items });
    }
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
