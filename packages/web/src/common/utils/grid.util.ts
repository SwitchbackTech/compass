import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import weekPlugin from "dayjs/plugin/weekOfYear";
import dayOfYear from "dayjs/plugin/dayOfYear";
import { Schema_Event } from "@core/types/event.types";
import {
  EVENT_PADDING_RIGHT,
  FLEX_EQUAL,
  FLEX_TMRW,
  FLEX_TODAY,
  FUTURE_MULTIPLE,
} from "@web/common/constants/grid.constants";
import { Category } from "@web/ducks/events/types";

dayjs.extend(dayOfYear);
dayjs.extend(weekPlugin);
dayjs.extend(isBetween);
interface AssignResult {
  fits: boolean;
  rowNum?: number;
}

export const assignEventToRow = (
  eventDays: number[],
  rows: number[][]
): AssignResult => {
  let fits = false;
  let rowNum: number;

  for (let rowIndex = 0; rowIndex < rows.length; ++rowIndex) {
    const occupiedDays = rows[rowIndex];
    if (_noOverlaps(eventDays, occupiedDays)) {
      fits = true;
      rowNum = rowIndex;
      break;
    }
  }

  return { fits, rowNum };
};

export const assignEventsToRow = (allDayEvents: Schema_Event[]) => {
  const rows: number[][] = [];
  // makes copy of all event objects to allow for adding a 'row' field
  // can likely be optimized using immer's `produce` and `draft`
  const orderedAllDayEvents = allDayEvents.map((e) => ({ ...e }));

  orderedAllDayEvents.forEach((event, i) => {
    const eventDays = _getEventDayNumbers(event);

    if (i === 0) {
      rows.push(eventDays);
      event["row"] = 1;
    } else {
      const { fits, rowNum } = assignEventToRow(eventDays, rows);

      if (fits) {
        // add to existing row
        rows[rowNum] = [...rows[rowNum], ...eventDays];
        event["row"] = rowNum + 1;
      } else {
        // add to new row
        rows[rows.length] = eventDays;
        event["row"] = rows.length;
      }
    }
  });

  return { rowsCount: rows.length, allDayEvents: orderedAllDayEvents };
};

//$$
const weekData = (event: Schema_Event) => {
  const startDate = dayjs(event.startDate);
  const startIndex = startDate.get("day");

  // const height = 2;
  // const top = 1;
  // const width = 20;
  // const left = 200;
};

export const getAllDayEventWidth = (
  category: Category,
  startIndex: number,
  start: Dayjs,
  end: Dayjs,
  startOfWeek: Dayjs,
  widths: number[]
) => {
  let width: number;
  switch (category) {
    case Category.ThisWeekOnly: {
      let duration = end.diff(start, "days");
      if (duration === 0) {
        // if only one day, then use original width
        width = widths[startIndex];
        duration = 1; // prevents width from being 0
      }
      width = _sumEventWidths(duration, startIndex, widths);
      break;
    }
    case Category.ThisToFutureWeek: {
      width = _sumEventWidths(7 - startIndex, startIndex, widths);
      break;
    }
    case Category.PastToThisWeek: {
      const daysThisWeek = end.diff(startOfWeek, "days");
      // start at 0 because event carries over from last week
      width = _sumEventWidths(daysThisWeek, 0, widths);
      break;
    }
    case Category.PastToFutureWeek: {
      width = _sumEventWidths(7, 0, widths);
      break;
    }
    default: {
      console.log("Logic error while parsing date width");
      width = -666;
    }
  }

  return widthMinusPadding(width);
};

export const getCurrentMinute = () => {
  return dayjs().get("hours") * 60 + dayjs().get("minutes");
};

export const getCurrentPercentOfDay = () => {
  return (getCurrentMinute() / 1440) * 100;
};

export const getFlexBasis = (day: Dayjs, week: number, today: Dayjs) => {
  // past/future week
  if (week !== today.week()) return FLEX_EQUAL;

  const todaysWeekNum = today.get("day") + 1;
  const flexBasisByDay = {
    [todaysWeekNum]: FLEX_TODAY,
    [todaysWeekNum + 1]: FLEX_TMRW,
  };

  // today or tmrw
  const thisDaysWeekNum = day.get("day") + 1;
  const flexBasis = flexBasisByDay[thisDaysWeekNum];
  if (flexBasis) return flexBasis;

  const prevDayFlex = getPrevDayWidth(today);
  if (today.isAfter(day)) {
    // previous day
    return prevDayFlex;
  }
  // future day
  return prevDayFlex * FUTURE_MULTIPLE;
};

export const getLeftPosition = (
  category: Category,
  startIndex: number,
  widths: number[]
) => {
  let positionStart: number;
  switch (category) {
    case Category.PastToThisWeek:
    case Category.PastToFutureWeek: {
      positionStart = 0;
      break;
    }
    case Category.ThisWeekOnly:
    case Category.ThisToFutureWeek:
      {
        // add up from 0 index to startIndex
        positionStart = widths.reduce((accum, width, index) => {
          return index < startIndex ? accum + width : accum;
        }, 0);
      }
      break;
    default: {
      console.log("Logic error while parsing left position of date");
      positionStart = -666;
    }
  }
  return positionStart;
};
export const getLineClamp = (durationHours: number) => {
  // how were these magic numbers determined?
  const heightOfEvent = 54 * +durationHours.toFixed(2) || 0.25;
  return Math.round((heightOfEvent - 7) / 16) || 1;
};

export const getPrevDayWidth = (today: Dayjs) => {
  const todayWeekNum = today.get("day") + 1;
  const yesterdayDayNum = todayWeekNum - 1;
  const futureDays = 5 - yesterdayDayNum; // 5 cuz exclude today and tmrw
  const futureFactor = futureDays * FUTURE_MULTIPLE;
  const diff = yesterdayDayNum + futureFactor;
  const width = 60 / diff;

  return width;
};

const normalizeDayNums = (days: number[]) => {
  // doesn't support events longer than 365/6 days
  return days.map((d) => {
    if (d < 365) {
      return d + 365;
    } else {
      return d;
    }
  });
};

export const widthMinusPadding = (width: number) => {
  const adjustedWidth = width - EVENT_PADDING_RIGHT;

  if (adjustedWidth < 0) {
    return width;
  }
  return adjustedWidth;
};

const _anySharedValues = (arr1: number[], arr2: number[]) => {
  return arr1.some((v) => arr2.indexOf(v) >= 0);
};

const _getEventDayNumbers = (event: Schema_Event) => {
  const startDayOfYear = dayjs(event.startDate).dayOfYear();
  const endDayOfYear = dayjs(event.endDate).dayOfYear();
  const eventDays = _range(startDayOfYear, endDayOfYear);

  /*
    removes the last number so that it doesnt overlap with neighboring events
    example: 
      - an event on July 4 is represented as yyyy-07-04 - yyyy-07-05
        - its originaly day numbers are: [85, 86]
      - this will cause it to erroneously overlap with an event on July 5 
        - because July 5 day numbers will be [86, 87]
        - 86 is shared between both days
      - removing the second number fixes this, because:
        - July 4 is represented as [85]
        - July 5 is [86]
        - There is no overlap, so they can fit on the same row
  */
  eventDays.pop();
  return eventDays;
};

const _noOverlaps = (eventDays: number[], occupiedDays: number[]) => {
  const anyOverlapsThisYear = eventDays.some(
    (day) => occupiedDays.indexOf(day) >= 0
  );
  if (anyOverlapsThisYear) {
    return false;
  }

  /*
  check for events that go into next year
  */
  const normalizedDays = normalizeDayNums(eventDays);
  const normalizedOccupiedDays = normalizeDayNums(occupiedDays);

  const anyOverlapsNextYear = _anySharedValues(
    normalizedDays,
    normalizedOccupiedDays
  );

  if (anyOverlapsNextYear) {
    return false;
  }

  return true;
};

const _range = (start: number, end: number) => {
  const yearChanges = end - start < 0;

  if (yearChanges) {
    const endYearChange = start + end; // eg. converts 2 to 367/8 (365/6 +2)
    const r = Array(endYearChange - start + 1)
      .fill(null)
      .map((_, idx) => start + idx);
    return r;
  }

  return Array(end - start + 1)
    .fill(null)
    .map((_, idx) => start + idx);
};

const _sumEventWidths = (
  duration: number,
  startIndex: number,
  widths: number[]
) => {
  // create array of numbers, one for each day, setting each to 0 by default,
  // then set values based on the widths of the days of the event
  const eventWidths: number[] = Array(duration || 0)
    .fill(0)
    .map((_, index) => widths[index + startIndex] || 0);

  // add up width of each day of the event
  const eventWidth = eventWidths.reduce((accum, value) => accum + value, 0);
  return eventWidth;
};
