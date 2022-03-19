import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import weekPlugin from "dayjs/plugin/weekOfYear";
import dayOfYear from "dayjs/plugin/dayOfYear";
import {
  FLEX_EQUAL,
  FLEX_TMRW,
  FLEX_TODAY,
  FUTURE_MULTIPLE,
} from "@web/common/constants/grid.constants";
import { Category } from "@web/ducks/events/types";
import { Schema_Event } from "@core/types/event.types";

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

  if (eventDays[0] === 76 && eventDays[1] === 77) {
    console.log("checking for space in:", rows);
  }

  // this is looping thru every # in every row array
  // need to jus go thru every child array in the parent row array
  // for (const [i, assignedDays] of rows.entries()) {
  for (let i = 0; i < rows.length; ++i) {
    const occupiedDays = rows[i];

    // for (let j = 0; j < occupiedDays.length; ++j) {
    const anyOverlaps = eventDays.some((r) => occupiedDays.indexOf(r) >= 0);
    if (!anyOverlaps) {
      if (eventDays[0] === 76 && eventDays[1] === 77) {
        console.log(`${eventDays} doesnt overlap anything in:`, occupiedDays);
      }
      fits = true;
      rowNum = i;
      break;
    }
    // }
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
  const top: number = _position[row];
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

const range = (start: number, end: number) => {
  return Array(end - start + 1)
    .fill()
    .map((_, idx) => start + idx);
};

export const getAllRowData = (allDayEvents: Schema_Event[]) => {
  const rows: number[][] = [];
  const allEventNums = [];

  allDayEvents.forEach((event, i) => {
    const startDayOfYear = dayjs(event.startDate).dayOfYear();
    const endDayOfYear = dayjs(event.endDate).dayOfYear();
    const eventDays = range(startDayOfYear, endDayOfYear);
    allEventNums[i] = [eventDays];
    //i = 7
    if (i === 5) {
      const f = "me";
    }
    if (i === 0) {
      rows.push(eventDays);
      event["row"] = 1;
    } else {
      const { fits, rowNum } = assignEventToRow(eventDays, rows);

      if (fits) {
        event["row"] = rowNum + 1;
        rows[rowNum] = [...rows[rowNum], ...eventDays];
      } else {
        // create new row
        // rowsCount += 1;
        // const newRowNum = rows.length + 1;
        rows[rows.length] = eventDays; // .length is 1 index
        // event["row"] = rows.length + 1; // +1 cuz row is 0 index (?)
        event["row"] = rows.length;
      }
    }
  });

  console.log(allEventNums);
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
