import dayjs, { Dayjs } from "dayjs";
import weekPlugin from "dayjs/plugin/weekOfYear";
import {
  FLEX_TODAY,
  FLEX_TMRW,
  FUTURE_MULTIPLE,
  FLEX_EQUAL,
} from "@web/common/constants/grid.constants";

dayjs.extend(weekPlugin);

export const getPrevDayWidth = (today: Dayjs) => {
  const todayWeekNum = today.get("day") + 1;
  const beforeDaysCount = todayWeekNum - 1;
  const afterDaysCount = 5 - beforeDaysCount;

  return 60 / (beforeDaysCount + FUTURE_MULTIPLE * afterDaysCount);
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
