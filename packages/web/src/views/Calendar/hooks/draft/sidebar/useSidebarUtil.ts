import { useCallback } from "react";
import dayjs from "dayjs";
import {
  SOMEDAY_MONTH_LIMIT_MSG,
  SOMEDAY_WEEK_LIMIT_MSG,
} from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import {
  Categories_Event,
  Direction_Migrate,
  Schema_Event,
} from "@core/types/event.types";
import { DropResult } from "@hello-pangea/dnd";
import { ID_SOMEDAY_DRAFT } from "@web/common/constants/web.constants";
import { DropResult_ReactDND } from "@web/common/types/dnd.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  prepEvtAfterDraftDrop,
  getDefaultEvent,
  prepEvtBeforeSubmit,
} from "@web/common/utils/event.util";
import { getX } from "@web/common/utils/grid.util";
import { getUserId } from "@web/auth/auth.util";
import { Coordinates } from "@web/common/types/util.types";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import {
  createEventSlice,
  editEventSlice,
} from "@web/ducks/events/slices/event.slice";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import {
  selectIsAtMonthlyLimit,
  selectIsAtWeeklyLimit,
} from "@web/ducks/events/selectors/someday.selectors";
import {
  getDatesByCategory,
  getMigrationDates,
} from "@web/common/utils/web.date.util";
import { selectDatesInView } from "@web/ducks/events/selectors/view.selectors";
import { isEventFormOpen, isSomedayEventFormOpen } from "@web/common/utils";
import { selectIsDrafting } from "@web/ducks/events/selectors/draft.selectors";

import { DateCalcs } from "../../grid/useDateCalcs";
import { State_Sidebar } from "./useSidebarState";

export const useSidebarUtil = (
  dateCalcs: DateCalcs,
  state: State_Sidebar,
  setDraft: React.Dispatch<React.SetStateAction<Schema_GridEvent>>,
  setIsDrafting: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const dispatch = useAppDispatch();

  const isDraftingOnGrid = useAppSelector(selectIsDrafting);
  const isAtWeeklyLimit = useAppSelector(selectIsAtWeeklyLimit);
  const isAtMonthlyLimit = useAppSelector(selectIsAtMonthlyLimit);
  const { start, end } = useAppSelector(selectDatesInView);

  const viewStart = dayjs(start);
  const viewEnd = dayjs(end);

  const resetLocalDraftStateIfNeeded = () => {
    if (!state.isDrafting) return;

    if (isSomedayEventFormOpen()) {
      state.setIsDrafting(false);
      state.setDraft(null);
    }
  };

  const close = () => {
    state.setIsDrafting(false);
    state.setDraft(null);

    const isSomeday =
      state.draftType === Categories_Event.SOMEDAY_WEEK ||
      state.draftType == Categories_Event.SOMEDAY_MONTH;

    if (state.isDraftingExisting || (state.isDraftingNew && isSomeday)) {
      dispatch(draftSlice.actions.discard());
    }
  };

  // call this when enabling DND for drafts
  const convertSomedayDraftToTimed = (
    dropItem: DropResult_ReactDND,
    dates: { startDate: string; endDate: string }
  ) => {
    const event = prepEvtAfterDraftDrop(
      Categories_Event.TIMED,
      dropItem,
      dates
    );

    dispatch(createEventSlice.actions.request(event));
    dispatch(draftSlice.actions.discard());
  };

  const convertSomedayDraftToAllDay = (
    dropItem: DropResult_ReactDND,
    dates: { startDate: string; endDate: string }
  ) => {
    const event = prepEvtAfterDraftDrop(
      Categories_Event.ALLDAY,
      dropItem,
      dates
    );

    dispatch(createEventSlice.actions.request(event));
    dispatch(draftSlice.actions.discard());
  };

  const convertSomedayEventToAllDay = (
    _id: string,
    dates: { startDate: string; endDate: string }
  ) => {
    const updatedFields: Schema_Event = {
      isAllDay: true,
      isSomeday: false,
      startDate: dates.startDate,
      endDate: dates.endDate,
    };

    dispatch(
      getSomedayEventsSlice.actions.convert({
        _id,
        updatedFields,
      })
    );
  };

  const convertSomedayEventToTimed = (
    _id: string,
    dates: { startDate: string; endDate: string }
  ) => {
    const updatedFields: Schema_Event = {
      isAllDay: false,
      isSomeday: false,
      startDate: dates.startDate,
      endDate: dates.endDate,
    };

    dispatch(
      getSomedayEventsSlice.actions.convert({
        _id,
        updatedFields,
      })
    );
  };

  const createDefaultSomeday = useCallback(() => {
    const somedayDefault = getDefaultEvent(Categories_Event.SOMEDAY_WEEK);

    setDraft({ ...somedayDefault, isOpen: true });
    setIsDrafting(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setDraft]);

  const getDatesAfterDroppingOn = (
    target: "mainGrid" | "alldayRow",
    mouseCoords: Coordinates
  ) => {
    const x = getX(mouseCoords.x, true);
    const y = mouseCoords.y;

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

  const onDraft = (event: Schema_Event, category: Categories_Event) => {
    state.setIsDrafting(true);
    state.setDraft({
      ...event,
      isOpen: true,
    });

    dispatch(
      draftSlice.actions.start({
        event: event,
        eventType: category,
      })
    );
  };

  const discardIfDrafting = () => {
    if (state.isDrafting) {
      dispatch(draftSlice.actions.discard());
      close();
      return;
    }
    if (isDraftingOnGrid) {
      dispatch(draftSlice.actions.discard());
    }
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, draggableId, source } = result;

    const droppedOnSidebar = destination !== null;
    if (droppedOnSidebar) {
      const reorderedDraft = draggableId === ID_SOMEDAY_DRAFT;
      if (reorderedDraft && !state.isDraftingNew) {
        console.log("Tried reordering a draft. TODO: add draft to state");
        return;
      }

      const noChange =
        destination.droppableId === source.droppableId &&
        destination.index === source.index;

      if (noChange) {
        close();
        return;
      }

      reorder(result);
    } else {
      if (state.isOverMainGrid) {
        const dates = getDatesAfterDroppingOn("mainGrid", state.mouseCoords);
        convertSomedayEventToTimed(draggableId, dates);
      }

      if (state.isOverAllDayRow) {
        const dates = getDatesAfterDroppingOn("alldayRow", state.mouseCoords);
        convertSomedayEventToAllDay(draggableId, dates);
      }
    }

    close();
  };

  const onDragStart = (props: { draggableId: string }) => {
    const existingEvent = state.somedayEvents.events[props.draggableId];
    const isExisting = existingEvent !== undefined;

    let _draft: Schema_GridEvent;
    if (isExisting) {
      _draft = {
        ...existingEvent,
        isOpen: false,
      };
    } else {
      console.log("REMINDER: update for monthly");
      const defaultSomeday = getDefaultEvent(Categories_Event.SOMEDAY_WEEK);
      _draft = { ...defaultSomeday, isOpen: false };
    }

    state.setDraft(_draft);
    state.setIsDrafting(true);
  };

  const onMigrate = (
    event: Schema_Event,
    category: Categories_Event,
    direction: Direction_Migrate
  ) => {
    const _event = _updateEventAfterMigration(event, category, direction);

    const isExisting = _event._id;
    if (isExisting) {
      dispatch(
        editEventSlice.actions.request({
          _id: _event._id,
          event: _event,
        })
      );
    } else {
      dispatch(createEventSlice.actions.request(_event));
    }

    close();
  };

  const onSubmit = async (category: Categories_Event) => {
    if (!state.draft) return;

    const { startDate, endDate } = getDatesByCategory(
      category,
      viewStart,
      viewEnd
    );
    const _event = { ...state.draft, startDate, endDate };

    const userId = await getUserId();
    const event = prepEvtBeforeSubmit(_event, userId);

    const isExisting = event._id;
    if (isExisting) {
      const isRecurring = event.recurrence?.rule;
      const wasRecurring = event.recurrence?.rule === null;

      dispatch(
        editEventSlice.actions.request({
          _id: event._id,
          event,
          applyTo: isRecurring || wasRecurring ? "all" : null,
        })
      );
    } else {
      const order =
        category === Categories_Event.SOMEDAY_WEEK
          ? state.somedayWeekIds.length
          : state.somedayMonthIds.length;

      const eventWithOrder = {
        ...event,
        order,
      };
      dispatch(createEventSlice.actions.request(eventWithOrder));
    }

    close();
  };

  const onPlaceholderClick = (section: Categories_Event) => {
    if (state.isDrafting) {
      dispatch(draftSlice.actions.discard());
      close();
      return;
    }

    if (section === Categories_Event.SOMEDAY_WEEK && isAtWeeklyLimit) {
      alert(SOMEDAY_WEEK_LIMIT_MSG);
      return;
    }

    if (section === Categories_Event.SOMEDAY_MONTH && isAtMonthlyLimit) {
      alert(SOMEDAY_MONTH_LIMIT_MSG);
      return;
    }

    if (isEventFormOpen()) {
      dispatch(draftSlice.actions.discard());
      return;
    }

    dispatch(
      draftSlice.actions.start({
        eventType: section,
      })
    );

    createDefaultSomeday();
  };

  const reorder = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    const column = state.somedayEvents.columns[source.droppableId];
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

    state.setSomedayEvents(newState);

    const newOrder = newEventIds.map((_id, index) => {
      return { _id, order: index };
    });
    dispatch(getSomedayEventsSlice.actions.reorder(newOrder));
  };

  const _updateEventAfterMigration = (
    event: Schema_Event,
    category: Categories_Event,
    direction: Direction_Migrate
  ) => {
    const origDates = { startDate: event.startDate, endDate: event.endDate };
    const { startDate, endDate } = getMigrationDates(
      origDates,
      category,
      direction
    );

    const newEvent = { ...event, startDate, endDate, isOpen: false };
    return newEvent;
  };

  return {
    close,
    createDefaultSomeday,
    discardIfDrafting,
    onDraft,
    onDragEnd,
    onDragStart,
    onMigrate,
    onPlaceholderClick,
    onSubmit,
    resetLocalDraftStateIfNeeded,
    setDraft,
  };
};

export type Util_Sidebar = ReturnType<typeof useSidebarUtil>;
