import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import weekPlugin from "dayjs/plugin/weekOfYear";
import { FUTURE_MULTIPLE } from "@web/common/constants/grid.constants";
import { Category } from "@web/ducks/events/types";
import { Schema_Event } from "@core/types/event.types";

dayjs.extend(weekPlugin);
dayjs.extend(isBetween);

export const getAllDayRowData = (allDayEvents: Schema_Event[]) => {
  //$$ TODO filter out start/ends that overflow the week
  let rowsCount = 0;
  const rows = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  };
  // const rows = { 0: [] };
  allDayEvents.forEach((event, i) => {
    // if (i === 0) {
    //   // the first always fits
    //   rows[0].push([event.startDate, event.endDate]);
    // }
    const { fits, rowNum } = tryFittingInExistingRow(event, rows);
    if (fits) {
      rows[rowNum].push([event.startDate, event.endDate]);
    } else {
      // while (!res.fits) {}
      // res.fits = true;
      // add new row
      rowsCount += 1;
      rows[rowsCount].push([[event.startDate, event.endDate]]);
    }
    /*
    let fits = res.fits;
    let rowNum;
    do {
      rowsCount += 1;
      rows[res.rowsCount].push([[event.startDate, event.endDate]]);
      res = fitsInExistingRow(event, rows);
      rowNum = res.rowNum;
      fits = res.fits;
      console.log("made another row");
    } while (!fits);
    */

    event.row = parseInt(rowNum);
  });

  return { rows, allDayEvents };
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

const tryFittingInExistingRow = (event: Schema_Event, rows) => {
  const start = dayjs(event.startDate);
  const end = dayjs(event.endDate);

  for (const rowNum of Object.keys(rows)) {
    if (rows[rowNum].length === 0) {
      return { fits: true, rowNum };
    }
    for (const i of rows[rowNum]) {
      const startFits = !start.isBetween(dayjs(i[0]), dayjs(i[1]), "day", "[]");
      const endFits = !end.isBetween(dayjs(i[0]), dayjs(i[1]), "day", "[]");

      if (startFits && endFits) {
        return { fits: true, rowNum };
      }
    }
  }

  return { fits: false, rowNum: null };
};
