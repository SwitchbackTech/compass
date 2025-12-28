import { ObjectId } from "bson";
import { useCallback, useMemo } from "react";
import { DropResult } from "@hello-pangea/dnd";
import {
  SOMEDAY_MONTH_LIMIT_MSG,
  SOMEDAY_WEEK_LIMIT_MSG,
} from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import {
  Categories_Event,
  Direction_Migrate,
  RecurringEventUpdateScope,
  Schema_Event,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { getUserId } from "@web/auth/auth.util";
import {
  COLUMN_MONTH,
  COLUMN_WEEK,
  ID_SOMEDAY_DRAFT,
} from "@web/common/constants/web.constants";
import { getPointerPosition } from "@web/common/context/pointer-position";
import { DirtyParser } from "@web/common/parsers/dirty.parser";
import { Schema_WebEvent } from "@web/common/types/web.event.types";
import {
  computeCurrentEventDateRange,
  computeRelativeEventDateRange,
  getDatesByCategory,
} from "@web/common/utils/datetime/web.date.util";
import { assembleDefaultEvent } from "@web/common/utils/event/event.util";
import { isEventFormOpen } from "@web/common/utils/form/form.util";
import { getX } from "@web/common/utils/grid/grid.util";
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
import { selectDatesInView } from "@web/ducks/events/selectors/view.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { Activity_DraftEvent } from "@web/ducks/events/slices/draft.slice.types";
import {
  createEventSlice,
  editEventSlice,
} from "@web/ducks/events/slices/event.slice";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { parseSomedayEventBeforeSubmit } from "@web/views/Calendar/components/Draft/hooks/actions/submit.parser";
import { showMigrationToast } from "@web/views/Calendar/components/Draft/sidebar/hooks/MigrationToast";
import {
  Setters_Sidebar,
  State_Sidebar,
} from "@web/views/Calendar/components/Draft/sidebar/hooks/useSidebarState";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";

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

export const useSidebarActions = (
  dateCalcs: DateCalcs,
  state: State_Sidebar,
  setters: Setters_Sidebar,
  weekProps: WeekProps,
) => {
  const dispatch = useAppDispatch();

  const isDrafting = useAppSelector(selectIsDrafting);
  const isAtWeeklyLimit = useAppSelector(selectIsAtWeeklyLimit);
  const isAtMonthlyLimit = useAppSelector(selectIsAtMonthlyLimit);
  const { start, end } = useAppSelector(selectDatesInView);
  const reduxDraft = useAppSelector(selectDraft);
  const draftType = useAppSelector(selectDraftCategory);
  const activity = useAppSelector(selectDraftActivity);

  const isInstance = useMemo((): boolean => {
    return ObjectId.isValid(reduxDraft?.recurrence?.eventId ?? "");
  }, [reduxDraft?.recurrence?.eventId]);

  const viewStart = dayjs(start);
  const viewEnd = dayjs(end);

  const { setDraft, setIsDrafting, setIsSomedayFormOpen, setSomedayEvents } =
    setters;

  const close = () => {
    setIsDrafting(false);
    setDraft(null);

    const isSomeday =
      draftType === Categories_Event.SOMEDAY_WEEK ||
      draftType == Categories_Event.SOMEDAY_MONTH;

    if (state.isDraftingExisting || (state.isDraftingNew && isSomeday)) {
      dispatch(draftSlice.actions.discard());
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

  const createDefaultSomeday = useCallback(async () => {
    const somedayDefault = await assembleDefaultEvent(
      Categories_Event.SOMEDAY_WEEK,
    );

    setDraft(somedayDefault);
    setIsSomedayFormOpen(true);
    setIsDrafting(true);
  }, [setDraft, setIsDrafting, setIsSomedayFormOpen]);

  const discard = useCallback(() => {
    if (state.draft) {
      setDraft(null);
    }

    if (reduxDraft) {
      dispatch(draftSlice.actions.discard());
    }
  }, [state.draft, reduxDraft, setDraft, dispatch]);

  const getDatesAfterDroppingOn = (target: "mainGrid" | "alldayRow") => {
    const cursor = getPointerPosition();
    const x = getX(cursor.clientX, true);
    const y = cursor.clientY;

    if (target === "mainGrid") {
      const _start = dateCalcs.getDateByXY(x, y, viewStart);
      const startDate = _start.format();
      const endDate = _start.add(1, "hour").format();

      return { startDate, endDate };
    }

    if (target === "alldayRow") {
      const _start = dateCalcs.getDateByXY(x, y, viewStart);
      const startDate = _start.format(YEAR_MONTH_DAY_FORMAT);
      const endDate = _start.add(1, "day").format(YEAR_MONTH_DAY_FORMAT);

      return { startDate, endDate };
    }
  };

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

  const onDragEnd = (result: DropResult) => {
    const { destination, draggableId, source } = result;

    const handleDiscard = () => {
      dispatch(draftSlice.actions.discard());
      close();
    };

    const droppedOnSidebar = destination !== null;
    if (droppedOnSidebar) {
      const reorderedDraft = draggableId === ID_SOMEDAY_DRAFT;
      if (reorderedDraft && !state.isDraftingNew) {
        handleDiscard();
        return;
      }

      const noChange =
        destination.droppableId === source.droppableId &&
        destination.index === source.index;

      if (noChange) {
        handleDiscard();
        return;
      }

      reorder(result);
    } else {
      const grid = state.isOverMainGrid ? "mainGrid" : "alldayRow";
      const dates = getDatesAfterDroppingOn(grid);

      convertSomedayToCalendarEvent(draggableId, {
        ...dates,
        isAllDay: state.isOverAllDayRow,
      });
    }

    handleDiscard();
  };

  const onDragStart = async (props: { draggableId: string }) => {
    const existingEvent = state.somedayEvents.events[props.draggableId];
    const isExisting = existingEvent !== undefined;

    dispatch(draftSlice.actions.startDnd());

    if (isExisting) {
      setDraft(existingEvent);
    } else {
      const defaultSomeday = await assembleDefaultEvent(
        Categories_Event.SOMEDAY_WEEK,
      );
      setDraft(defaultSomeday);
    }

    setIsDrafting(true);
  };

  const onMigrate = (
    event: Schema_Event,
    category: Categories_Event,
    direction: Direction_Migrate,
  ) => {
    const weekViewRange = {
      startDate: start,
      endDate: end,
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
        weekProps.state.setStartOfView(targetDate.startOf("month"));
      });
    }

    const isExisting = _event._id;
    if (isExisting) {
      dispatch(
        editEventSlice.actions.request({
          _id: _event._id,
          event: _event,
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
      dispatch(draftSlice.actions.discard());
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
      dispatch(draftSlice.actions.discard());
      return;
    }

    const event = await assembleDefaultEvent(Categories_Event.SOMEDAY_WEEK);

    dispatch(
      draftSlice.actions.start({
        activity,
        eventType: category,
        event,
      }),
    );

    createDefaultSomeday();
  };

  const onSubmit = async (
    category: Categories_Event,
    event: Schema_Event | null = state.draft,
  ) => {
    if (!event) return;

    let _event = { ...event };
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
    _event = parseSomedayEventBeforeSubmit(_event, userId);

    const isExisting = _event._id;
    if (isExisting) {
      const recurrenceChanged = DirtyParser.recurrenceChanged(
        _event as Schema_WebEvent,
        reduxDraft!,
      );

      // For someday events, always use THIS_EVENT scope to allow individual customization
      const applyTo =
        isInstance && recurrenceChanged && !_event.isSomeday
          ? RecurringEventUpdateScope.ALL_EVENTS
          : RecurringEventUpdateScope.THIS_EVENT;

      dispatch(
        editEventSlice.actions.request({
          _id: _event._id,
          event: _event,
          applyTo,
        }),
      );
    } else {
      const order =
        category === Categories_Event.SOMEDAY_WEEK
          ? state.somedayWeekIds.length
          : state.somedayMonthIds.length;

      const eventWithOrder = {
        ..._event,
        order,
      };
      dispatch(createEventSlice.actions.request(eventWithOrder));
    }

    close();
  };

  const handleCrossColumnDragging = (
    source: { droppableId: string; index: number },
    destination: { droppableId: string; index: number },
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
      startDate: start,
      endDate: end,
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

    draggedEvent.order = newOrder;

    dispatch(
      editEventSlice.actions.request({
        _id: draggedEvent._id,
        event: draggedEvent,
      }),
    );
  };

  const handleSameColumnReordering = (
    source: { droppableId: string; index: number },
    destination: { droppableId: string; index: number },
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

  const reorder = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

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
    onDragEnd,
    onDragStart,
    onMigrate,
    createSomedayDraft,
    onSubmit,
    reset,
    setDraft,
  };
};

export type Actions_Sidebar = ReturnType<typeof useSidebarActions>;
