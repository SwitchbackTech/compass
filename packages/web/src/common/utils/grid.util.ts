import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import weekPlugin from "dayjs/plugin/weekOfYear";
import {
  FLEX_EQUAL,
  FLEX_TMRW,
  FLEX_TODAY,
  FUTURE_MULTIPLE,
} from "@web/common/constants/grid.constants";
import { Category } from "@web/ducks/events/types";
import { Schema_Event } from "@core/types/event.types";

dayjs.extend(weekPlugin);
dayjs.extend(isBetween);
interface AssignResult {
  fits: boolean;
  rowNum?: number;
}

export const assignEventToRow = (event: Schema_Event, rows: AssignResult) => {
  const start = dayjs(event.startDate);

  for (const rowIndex of Object.keys(rows)) {
    const rowNum = parseInt(rowIndex);

    for (const i of rows[rowNum]) {
      const startFits = !start.isBetween(dayjs(i[0]), dayjs(i[1]), "day", "[]");

      if (startFits) {
        const end = dayjs(event.endDate);
        const endFits = !end.isBetween(dayjs(i[0]), dayjs(i[1]), "day", "[]");

        if (endFits) {
          return { fits: true, rowNum };
        }
      }
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
  const top = _position[row];
  console.log(`
  allDayRowHeight: ${allDayRowHeight}
  eventHeight: ${eventHeight}
  row: ${row}
  ----
  top: ${top}
  `);
  return top;
};

export const getAllDayRowData = (allDayEvents: Schema_Event[]) => {
  let rowCount = 0;
  const rows = {};

  allDayEvents.forEach((event) => {
    const { fits, rowNum } = assignEventToRow(event, rows);

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
