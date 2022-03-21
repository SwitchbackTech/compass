import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import weekPlugin from "dayjs/plugin/weekOfYear";
import dayOfYear from "dayjs/plugin/dayOfYear";
import { Schema_Event } from "@core/types/event.types";
import {
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

// $$
export const assignEventToRowByComparison = (
  event: Schema_Event,
  rows: AssignResult
) => {
  // only checking within its peer row, not all rows (?)
  const start = dayjs(event.startDate);

  for (const rowIndex of Object.keys(rows)) {
    const rowNum = parseInt(rowIndex);

    //$$ todo check for each place, cuz later one might conflict
    const startFitsResults = [];
    const endFitsResults = [];
    for (const i of rows[rowNum]) {
      const startFitsInterval = !start.isBetween(
        dayjs(i[0]),
        dayjs(i[1]),
        "day",
        "[]"
      );
      startFitsResults.push(startFitsInterval);

      const end = dayjs(event.endDate);
      const endFitsInterval = !end.isBetween(
        dayjs(i[0]),
        dayjs(i[1]),
        "day",
        "[]"
      );
      endFitsResults.push(endFitsInterval);
    }
    //$$ confirm they fit in the same slot (?)
    const eventFitsInRow =
      startFitsResults.includes(true) && endFitsResults.includes(true);
    if (eventFitsInRow) {
      return { fits: true, rowNum };
    }
  }
  return { fits: false };
};

export const getAllDayEventTop = (
  eventHeight: number,
  row: number,
  allDayRowHeight: number
): number => {
  // top = height / order;
  // const order = event.allDayOrder || 1;
  // top = allDayRowHeight - height * order;
  //top = height * event.rowOrder;
  const _eventHeight = 25.26;
  const _rowsCount = 6;
  const _position = {
    0: _eventHeight * 1,
    1: _eventHeight * 1,
    2: _eventHeight * 2,
    3: _eventHeight * 3,
    4: _eventHeight * 4,
    5: _eventHeight * 5,
    6: _eventHeight * 6,
    7: _eventHeight * 7,
  };
  // const top: number = _position[row];
  const top = _eventHeight * row;

  //$$
  // console.log(`
  // allDayRowHeight: ${allDayRowHeight}
  // eventHeight: ${eventHeight}
  // row: ${row}
  // ----
  // top: ${top}
  // `);
  return top;
};

export const getAllRowData = (allDayEvents: Schema_Event[]) => {
  const rows: number[][] = [];

  allDayEvents.forEach((event, i) => {
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

  return { rowsCount: rows.length, allDayEvents };
};

export const getAllDayRowDataByComparison = (allDayEvents: Schema_Event[]) => {
  let rowCount = 0;
  const rows = {};

  allDayEvents.forEach((event) => {
    const { fits, rowNum } = assignEventToRowByComparison(event, rows);

    if (fits) {
      // add to existing
      rows[rowNum].push([event.startDate, event.endDate]);
      event["row"] = rowNum;
    } else {
      // add new
      rowCount += 1;
      rows[rowCount] = [[event.startDate, event.endDate]];
      event["row"] = rowCount;
    }
  });

  return { rowCount, allDayEvents };
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

export const getPrevDayWidth = (today: Dayjs) => {
  const todayWeekNum = today.get("day") + 1;
  const yesterdayDayNum = todayWeekNum - 1;
  const futureDays = 5 - yesterdayDayNum; // 5 cuz exclude today and tmrw
  const futureFactor = futureDays * FUTURE_MULTIPLE;
  const diff = yesterdayDayNum + futureFactor;
  const width = 60 / diff;

  return width;
};

const _anySharedValues = (arr1: number[], arr2: number[]) => {
  return arr1.some((v) => arr2.indexOf(v) >= 0);
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
