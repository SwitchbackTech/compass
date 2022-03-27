import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import weekPlugin from "dayjs/plugin/weekOfYear";
import { Origin, Priorities } from "@core/core.constants";
import { Schema_Event } from "@core/types/event.types";
import {
  HOURS_AM_FORMAT,
  YEAR_MONTH_DAY_FORMAT,
  YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT,
} from "@web/common/constants/dates";
import { LocalStorage } from "@web/common/constants/web.constants";
import { roundByNumber } from "@web/common/utils";
import { getAmPmTimes, toUTCOffset } from "@web/common/utils/date.utils";
import {
  selectAllDayEvents,
  selectWeekEvents,
} from "@web/ducks/events/selectors";
import {
  createEventSlice,
  deleteEventSlice,
  editEventSlice,
  eventsEntitiesSlice,
  getWeekEventsSlice,
} from "@web/ducks/events/slice";
import { getFlexBasis } from "@web/common/utils/grid.util";

import {
  GRID_TIME_STEP,
  GRID_X_OFFSET,
  GRID_Y_OFFSET as _GRID_Y_OFFSET,
} from "../constants";
import { State_Event, Schema_GridEvent } from "./types";

dayjs.extend(weekPlugin);
dayjs.extend(utc);
dayjs.extend(timezone);

export const useGetWeekViewProps = () => {
  /**************
   * General
   *************/
  const today = dayjs();
  const dispatch = useDispatch();

  /**************
   * Refs Init
   *************/
  const calendarRef = useRef<HTMLDivElement>(null);
  const eventsGridRef = useRef<HTMLDivElement>(null);
  const weekDaysRef = useRef<HTMLDivElement>(null);
  const allDayEventsGridRef = useRef<HTMLDivElement>(null);

  /*************
   * State Init
   *************/
  const [editingEvent, setEditingEvent] = useState<Schema_GridEvent | null>(
    null
  );
  const [week, setWeek] = useState(today.week());
  //$$ change to useRef to avoid re-rendering?
  const [modifiableDateField, setModifiableDateField] = useState<
    "startDate" | "endDate" | null
  >(null);
  const [eventState, setEventState] = useState<State_Event | null>(null);

  /*********
   * Events
   *********/
  /*
   enable these memo-ized version once fixing issue of entire calendarview re-rendering:
    const allDayEvents = useSelector(selectAllDayEventsMemo);
    const weekEvents = useSelector(selectWeekEventsMemo);
  */
  const weekEvents = useSelector(selectWeekEvents);
  const allDayEvents = useSelector(selectAllDayEvents);

  const rowVals = allDayEvents.map((e: Schema_GridEvent) => e.row);
  const rowsCount = rowVals.length === 0 ? 1 : Math.max(...rowVals);

  /****************
   * Relative Times
   ***************/
  const startOfSelectedWeekDay = today.week(week).startOf("week");
  const endOfSelectedWeekDay = today.week(week).endOf("week");

  const weekDays = [...(new Array(7) as number[])].map((_, index) => {
    return startOfSelectedWeekDay.add(index, "day");
  });

  const dayjsBasedOnWeekDay = today.week(week);
  const times = getAmPmTimes();
  const todayDayWeekNumber = today.get("day") + 1;
  const yesterdayDayNumber = todayDayWeekNumber - 1;

  /*********
   * Grid
   *********/
  const [CALCULATED_GRID_X_OFFSET, setGridXOffset] = useState(
    (calendarRef.current?.offsetLeft || 0) + GRID_X_OFFSET
  );
  const [GRID_Y_OFFSET, setGridYOffset] = useState(
    allDayEventsGridRef.current?.clientHeight || 0
  );

  /*************
   * Effects
   *************/
  useEffect(() => {
    setGridYOffset(
      _GRID_Y_OFFSET + (allDayEventsGridRef.current?.clientHeight || 0)
    );
  }, [allDayEventsGridRef.current?.clientHeight, rowsCount]);

  useEffect(() => {
    setGridXOffset(GRID_X_OFFSET + (calendarRef.current?.offsetLeft || 0));
  }, [calendarRef.current?.offsetLeft]);

  useEffect(() => {
    dispatch(
      getWeekEventsSlice.actions.request({
        startDate: toUTCOffset(startOfSelectedWeekDay),
        endDate: toUTCOffset(endOfSelectedWeekDay),
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week]);

  /*************
   * Getters
   *************/
  const getAllDayEventCellHeight = () =>
    allDayEventsGridRef.current?.clientHeight || 0;

  const getPastOverflowWidth = () => {
    if (today.week() > week) {
      // viewing past week
      return 100;
    }

    if (today.week() < week) {
      // future week, no overflow
      return 0;
    }

    if (yesterdayDayNumber === 6) {
      /* 
       then its the last day of the week (Sat)
       using the same logic as the other days
       would normally be fine, but the scrollbar width 
       would throw things off. 
       this works around that by just relying on todays width.

       PS not sure why you need to round up
      */
      const todayBasis = getFlexBasisWrapper(today);
      return Math.ceil(100 - todayBasis);
    }

    // Sun - Fri
    const yesterday = today.add(-1, "day");
    const yesterdayBasis = getFlexBasisWrapper(yesterday);
    const width = yesterdayBasis * yesterdayDayNumber;
    return width;
  };

  const getDateByMousePosition = (x: number, y: number) => {
    const clickX = x - CALCULATED_GRID_X_OFFSET;
    const clickY = y - GRID_Y_OFFSET;
    const eventCellHeight = getEventCellHeight();

    const dayNumber = getDayNumberByX(clickX);
    const minutesOnGrid = Math.round(
      ((clickY + (eventsGridRef.current?.scrollTop || 0)) / eventCellHeight) *
        60
    );

    const minute = roundByNumber(
      minutesOnGrid - GRID_TIME_STEP / 2,
      GRID_TIME_STEP
    );

    const date = startOfSelectedWeekDay
      .add(dayNumber, "day")
      .add(minute, "minutes");

    // $$ try using a TZ offset format
    // the frontend is currently trusted to pass it to backend
    // in TZ format, so better to keep it like that
    return date.format(YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT);
  };

  const getDayNumberByX = (x: number) => {
    let dayNumber = 0;
    Array.from(weekDaysRef.current?.children || []).reduce(
      (accum, child, index) => {
        if (x >= accum && x < accum + child.clientWidth) {
          dayNumber = index;
        }

        return accum + child.clientWidth;
      },
      0
    );

    return +dayNumber;
  };

  const getEventCellHeight = () =>
    (eventsGridRef.current?.clientHeight || 0) / 11;

  const getFlexBasisWrapper = (day: Dayjs) => {
    return getFlexBasis(day, week, today);
  };

  const getYByDate = (date: string) => {
    const day = dayjs(date);
    const eventCellHeight = getEventCellHeight();
    const startTime = times.indexOf(day.format(HOURS_AM_FORMAT)) / 4;

    return eventCellHeight * startTime;
  };

  /**********
   * Handlers
   **********/
  const onAllDayEventsGridMouseDown = (e: React.MouseEvent) => {
    if (editingEvent) return;

    const startDate = dayjs(getDateByMousePosition(e.clientX, e.clientY))
      .startOf("day")
      .format(YEAR_MONTH_DAY_FORMAT);

    const endDate = dayjs(startDate)
      .add(1, "day")
      .format(YEAR_MONTH_DAY_FORMAT);

    setModifiableDateField("endDate");

    setEditingEvent({
      priority: Priorities.WORK,
      isAllDay: true,
      startDate,
      endDate,
    });
  };

  const onDeleteEvent = (_id: string) => {
    dispatch(deleteEventSlice.actions.request({ _id: _id }));
    setEditingEvent(null);
  };

  const onEventDrag = (e: React.MouseEvent) => {
    setEditingEvent((actualEditingEvent) => {
      const _initialStart = getDateByMousePosition(
        e.clientX,
        // $$ get rid of mystery 2 - fixed the move bug...
        e.clientY - (eventState?.initialYOffset || 0) + 2
      );

      // $$ refactor getDateByMousePos to not return in the wrong format,
      // then refactor this to avoid re-parsing and formatting
      const startDate = actualEditingEvent?.isAllDay
        ? dayjs(_initialStart).format(YEAR_MONTH_DAY_FORMAT)
        : _initialStart;

      const _format = actualEditingEvent?.isAllDay
        ? YEAR_MONTH_DAY_FORMAT
        : YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT;
      const endDate = dayjs(_initialStart)
        .add(eventState?.initialMinutesDifference || 0, "minutes")
        .format(_format);

      return {
        ...actualEditingEvent,
        startDate,
        endDate,
        priority: actualEditingEvent?.priority || Priorities.WORK,
      };
    });
  };

  const onEventsGridMouseDown = (e: React.MouseEvent) => {
    const startDate = getDateByMousePosition(e.clientX, e.clientY);
    const endDate = dayjs(startDate)
      .add(GRID_TIME_STEP, "minute")
      .format(YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT);

    setModifiableDateField("endDate");

    setEditingEvent({
      priority: Priorities.WORK,
      startDate,
      endDate,
      isAllDay: false,
      isTimeSelected: false,
    });
  };

  const onEventGridMouseMove = (e: React.MouseEvent) => {
    if (eventState?.name === "dragging") {
      if (
        !eventState.hasMoved &&
        editingEvent?.startDate !== getDateByMousePosition(e.clientX, e.clientY)
      ) {
        setEventState((actualEventState) => ({
          ...actualEventState,
          name: "dragging",
          hasMoved: true,
        }));
      }

      onEventDrag(e);
      return;
    }

    if (!editingEvent || editingEvent.isOpen) {
      return;
    }

    const date = getDateByMousePosition(e.clientX, e.clientY);

    setEditingEvent((actualEditingEvent) => {
      if (!modifiableDateField) return actualEditingEvent;

      const reversedField =
        modifiableDateField === "startDate" ? "endDate" : "startDate";

      let dateField = modifiableDateField;
      let startDate = actualEditingEvent?.startDate;
      let endDate = actualEditingEvent?.endDate;

      const modifyingDateDiff =
        (actualEditingEvent &&
          Math.abs(
            dayjs(date).diff(actualEditingEvent[reversedField], "minute")
          )) ||
        0;

      if (modifyingDateDiff < GRID_TIME_STEP) {
        return actualEditingEvent;
      }

      if (
        modifiableDateField === "endDate" &&
        dayjs(date).isBefore(actualEditingEvent?.startDate)
      ) {
        dateField = reversedField;
        endDate = actualEditingEvent?.startDate;
        setModifiableDateField(dateField);
      }

      if (
        modifiableDateField === "startDate" &&
        dayjs(date).isAfter(actualEditingEvent?.endDate)
      ) {
        dateField = reversedField;
        startDate = actualEditingEvent?.endDate;
        setModifiableDateField(dateField);
      }

      return {
        ...actualEditingEvent,
        endDate,
        startDate,
        priority: actualEditingEvent?.priority || Priorities.WORK,
        [dateField]: date,
      };
    });
  };

  const onEventsGridRelease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEventState((actualEventState) => {
      setEditingEvent((actualEditingEvent) => {
        if (!actualEditingEvent) return actualEditingEvent;

        const shouldSubmitInDragState =
          actualEventState?.name === "dragging" && actualEventState.hasMoved;
        const shouldSubmit =
          shouldSubmitInDragState || actualEventState?.name === "rescaling";

        setEventState(null);

        if (shouldSubmit) {
          onSubmitEvent(actualEditingEvent);

          return null;
        }

        return {
          ...actualEditingEvent,
          isOpen: true,
          priority: actualEditingEvent?.priority || Priorities.WORK,
        };
      });

      return actualEventState;
    });
  };

  const onEventMouseDown = (e: React.MouseEvent, eventToDrag: Schema_Event) => {
    e.stopPropagation();
    e.preventDefault();

    const initialMinutesDifference = dayjs(eventToDrag.endDate).diff(
      eventToDrag.startDate,
      "minutes"
    );

    const initialYOffset =
      e.clientY -
      GRID_Y_OFFSET +
      (eventsGridRef.current?.scrollTop || 0) -
      getYByDate(eventToDrag.startDate || "");

    setEventState({
      name: "dragging",
      initialMinutesDifference,
      initialYOffset,
    });
    setEditingEvent({ ...eventToDrag, isOpen: false });
  };

  const onScalerMouseDown = (
    e: React.MouseEvent,
    eventToScale: Schema_Event,
    dateKey: "startDate" | "endDate"
  ) => {
    e.stopPropagation();
    setEventState({ name: "rescaling" });
    setModifiableDateField(dateKey);
    setEditingEvent({ ...eventToScale, isOpen: false });
  };

  const onSubmitEvent = (event: Schema_Event | Schema_GridEvent) => {
    const eventToSave = { ...event };

    const maxDayMinutes = 1440;

    const isEventOverlappingCurrentDay =
      Math.abs(
        dayjs(eventToSave.startDate)
          .startOf("day")
          .diff(eventToSave.endDate, "minute")
      ) > maxDayMinutes;

    if (!eventToSave.isAllDay && isEventOverlappingCurrentDay) {
      // swaps end and start dates
      eventToSave.endDate = dayjs(eventToSave.startDate).endOf("day").format();
    }

    // makes times compatible with backend/gcal/mongo
    eventToSave.startDate = eventToSave.isAllDay
      ? eventToSave.startDate
      : toUTCOffset(eventToSave.startDate); // startDate needs to be set before getting here

    eventToSave.endDate = eventToSave.isAllDay
      ? eventToSave.endDate
      : toUTCOffset(eventToSave.endDate); //endDate needs to be set before getting here

    if (eventToSave._id) {
      dispatch(
        editEventSlice.actions.request({
          _id: eventToSave._id,
          event: eventToSave,
        })
      );
    } else {
      eventToSave.origin = Origin.Compass;
      dispatch(createEventSlice.actions.request(eventToSave));
    }

    setEditingEvent(null);
  };

  /* 
  WIP. currently only adjust the week's events, and doesn't persist 
  Will need to be finished when adding a user setting that let's them
  manually change their timezone. Currently, the TZ is inferred by the 
  browser
  */
  const onTimezoneChange = () => {
    const timezone =
      localStorage.getItem(LocalStorage.TIMEZONE) || dayjs.tz.guess();
    dispatch(eventsEntitiesSlice.actions.updateAfterTzChange({ timezone }));
  };

  /*********
   * Assemble
   **********/
  return {
    eventHandlers: {
      onAllDayEventsGridMouseDown,
      onDeleteEvent,
      onEventsGridRelease,
      onEventsGridMouseDown,
      onEventGridMouseMove,
      onEventMouseDown,
      onScalerMouseDown,
      onSubmitEvent,
      onTimezoneChange,
      setEditingEvent,
    },
    component: {
      allDayEvents,
      allDayEventsGridRef,
      rowsCount,
      calendarRef,
      dayjsBasedOnWeekDay,
      editingEvent,
      eventsGridRef,
      eventState,
      setEditingEvent,
      setWeek,
      startOfSelectedWeekDay,
      endOfSelectedWeekDay,
      times,
      today,
      weekDays,
      weekDaysRef,
      weekEvents,
      week,
    },
    core: {
      getAllDayEventCellHeight,
      getPastOverflowWidth,
      getEventCellHeight,
      getFlexBasisWrapper,
    },
  };
};

export type WeekViewProps = ReturnType<typeof useGetWeekViewProps>;
