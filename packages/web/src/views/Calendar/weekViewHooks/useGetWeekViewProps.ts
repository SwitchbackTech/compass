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
import { GRID_TIME_STEP } from "@web/common/constants/grid.constants";

import {
  EVENT_DEFAULT_MIN,
  CALENDAR_X_START,
  CALENDAR_Y_START,
  SIDEBAR_WIDTH,
} from "../calendar.constants";
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
  const allDayEventsGridRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const eventsGridRef = useRef<HTMLDivElement>(null);
  const weekDaysRef = useRef<HTMLDivElement>(null);

  /*********
   * Grid
   *********/
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const [gridXOffset, setGridXOffset] = useState(0);
  const [gridYOffset, setGridYOffset] = useState(0);

  const hourlyCellHeight = (eventsGridRef.current?.clientHeight || 0) / 11;
  const scrollTop = eventsGridRef.current?.scrollTop || 0;

  /*************
   * State Init
   *************/
  const [editingEvent, setEditingEvent] = useState<Schema_GridEvent | null>(
    null
  );
  const [eventState, setEventState] = useState<State_Event | null>(null);
  const [modifiableDateField, setModifiableDateField] = useState<
    "startDate" | "endDate" | null
  >(null);
  const [week, setWeek] = useState(today.week());

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

  /*************
   * Effects
   *************/

  useEffect(() => {
    const widths = Array.from(weekDaysRef.current?.children || []).map(
      (e) => e.clientWidth
    );

    setColumnWidths(widths);
  }, [week, weekDaysRef.current?.clientWidth]);

  useEffect(() => {
    const yOffset =
      CALENDAR_Y_START + (allDayEventsGridRef.current?.clientHeight || 0);
    setGridYOffset(yOffset);
  }, [allDayEventsGridRef.current?.clientHeight, rowsCount]);

  useEffect(() => {
    // reminder: runs after toggling side bar toggled,
    // but not when resizing window
    const xOffset = CALENDAR_X_START + (calendarRef.current?.offsetLeft || 0);
    setGridXOffset(xOffset);
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
  const getAllDayEventCellHeight = () => hourlyCellHeight / 2.62; // got by experimenting by what looks right: ;

  const getColumnWidth = (dayIndex: number) => columnWidths[dayIndex];

  const getDateByX = (x: number) => {
    const clickX = x - gridXOffset;
    const dayIndex = getDayNumberByX(clickX);
    const date = startOfSelectedWeekDay.add(dayIndex, "day");

    return date;
  };

  const getDateByXY = (x: number, y: number) => {
    let date = getDateByX(x);

    const clickY = y - gridYOffset;
    const minutes = getMinuteByMousePosition(clickY);
    date = date.add(minutes, "minutes");

    return date;
  };

  const getDateStrByXY = (x: number, y: number) => {
    const date = getDateByXY(x, y);

    // $$ try using a TZ offset format (like the default .format())
    // the frontend is currently trusted to pass it to backend
    // in TZ format, so better to keep it like that
    return date.format(YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT);
  };

  const getDayNumberByX = (x: number) => {
    let dayNumber = 0;
    columnWidths.reduce((prev, width, index) => {
      if (x >= prev && x < prev + width) {
        dayNumber = index;
      }

      return prev + width;
    }, 0);

    return dayNumber;
  };

  const getFlexBasisWrapper = (day: Dayjs) => {
    return getFlexBasis(day, week, today);
  };

  const getMinuteByMousePosition = (y: number) => {
    const minutesOnGrid = Math.round(((y + scrollTop) / hourlyCellHeight) * 60);

    const minute = roundByNumber(
      minutesOnGrid - GRID_TIME_STEP / 2,
      GRID_TIME_STEP
    );

    // prevents negative number when clicking all-day row
    return Math.max(0, minute);
  };

  const getPastOverflowWidth = () => {
    const focusedWeek = today.week();
    if (focusedWeek > week) {
      // past week
      return 100;
    }

    if (focusedWeek < week) {
      // future week, no overflow
      return 0;
    }

    if (yesterdayDayNumber === 6) {
      /* 
       Saturday
       using the same logic as the other days
       would normally be fine, but the scrollbar width 
       would throw things off. 
       this works around that by just relying on todays width.
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

  const getYByDate = (date: string) => {
    const day = dayjs(date);
    const startTime = times.indexOf(day.format(HOURS_AM_FORMAT)) / 4;

    return hourlyCellHeight * startTime;
  };

  /**********
   * Handlers
   **********/
  const onAllDayEventsGridMouseDown = (e: React.MouseEvent) => {
    if (editingEvent) return;
    const adjustedX = e.clientX;

    const startDate = getDateByX(adjustedX).format();

    const endDate = dayjs(startDate).add(1, "day").startOf("day").format();
    // .format(YEAR_MONTH_DAY_FORMAT);

    setModifiableDateField("endDate");

    setEditingEvent({
      priority: Priorities.UNASSIGNED,
      isAllDay: true,
      startDate,
      endDate,
    });
  };

  const onDeleteEvent = (_id: string) => {
    if (_id === undefined) {
      return; // assume event was never created
    }
    dispatch(deleteEventSlice.actions.request({ _id: _id }));
  };

  const onEventDrag = (e: React.MouseEvent) => {
    setEditingEvent((actualEditingEvent) => {
      const _initialStart = getDateStrByXY(
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
        priority: actualEditingEvent?.priority || Priorities.UNASSIGNED,
      };
    });
  };

  const onCalendarAreaMouseDown = () => {
    if (editingEvent) {
      setEditingEvent(null);
      return;
    }
  };

  const onEventsGridMouseDown = (e: React.MouseEvent) => {
    if (editingEvent) {
      setEditingEvent(null);
      return;
    }

    const startDate = getDateStrByXY(e.clientX, e.clientY);
    const endDate = dayjs(startDate)
      .add(EVENT_DEFAULT_MIN, "minute")
      .format(YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT);

    setModifiableDateField("endDate");

    setEditingEvent({
      endDate,
      isAllDay: false,
      isTimesShown: true,
      priority: Priorities.UNASSIGNED,
      startDate,
    });
  };

  const onEventGridMouseMove = (e: React.MouseEvent) => {
    if (eventState?.name === "dragging") {
      if (
        !eventState.hasMoved &&
        editingEvent?.startDate !== getDateStrByXY(e.clientX, e.clientY)
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

    const date = getDateStrByXY(e.clientX, e.clientY);

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
        priority: actualEditingEvent?.priority,
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
          priority: actualEditingEvent?.priority || Priorities.UNASSIGNED,
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
      gridYOffset +
      scrollTop -
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
      eventToSave.origin = Origin.COMPASS;
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
      onCalendarAreaMouseDown,
      onDeleteEvent,
      onEventsGridRelease,
      onEventsGridMouseDown,
      onEventGridMouseMove,
      onEventMouseDown,
      onScalerMouseDown,
      onSubmitEvent,
      onTimezoneChange,
      setEditingEvent,
      setWeek,
    },
    component: {
      allDayEvents,
      allDayEventsGridRef,
      calendarRef,
      columnWidths,
      dayjsBasedOnWeekDay,
      editingEvent,
      endOfSelectedWeekDay,
      eventsGridRef,
      eventState,
      gridXOffset,
      gridYOffset,
      hourlyCellHeight,
      rowsCount,
      startOfSelectedWeekDay,
      times,
      today,
      weekDays,
      weekDaysRef,
      weekEvents,
      week,
    },
    core: {
      getAllDayEventCellHeight,
      getColumnWidth,
      getDateByXY,
      getDayNumberByX,
      getFlexBasisWrapper,
      getMinuteByMousePosition,
      getPastOverflowWidth,
    },
  };
};

export type WeekViewProps = ReturnType<typeof useGetWeekViewProps>;
