import {
  civilDayLengthMinutes,
  minutesFromCivilMidnight,
} from "@core/util/date/civil-day";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import {
  GRID_EVENT_TITLE_LINE_HEIGHT_PX,
  GRID_EVENT_TITLE_VERTICAL_SLACK_PX,
  TIMED_VISIBLE_HOURS,
} from "@web/grid/grid.constants";
import { getEffectiveTimeZone } from "@web/timezone/effective-timezone.store";
import {
  AFTER_TMRW_MULTIPLE,
  FLEX_EQUAL,
  FLEX_TMRW,
  FLEX_TODAY,
} from "@web/views/Week/layout.constants";

/** Index of the first row `eventDays` can share, or null when none fits. */
export const findRowForEvent = (
  eventDays: number[],
  rows: number[][],
): number | null => {
  const rowIndex = rows.findIndex((occupiedDays) =>
    _noOverlaps(eventDays, occupiedDays),
  );

  return rowIndex === -1 ? null : rowIndex;
};

const getCurrentMinute = (timeZone: string = getEffectiveTimeZone()) => {
  return minutesFromCivilMidnight(dayjs(), timeZone);
};

// Timed grid always renders exactly TIMED_VISIBLE_HOURS worth of rows in
// whatever height it's given, so this ratio is the single source of truth
// for converting between the grid's pixel geometry and clock minutes.
export const getMinuteHeight = (clientHeight: number) =>
  clientHeight / TIMED_VISIBLE_HOURS / 60;

export const getCurrentPercentOfDay = (
  timeZone: string = getEffectiveTimeZone(),
) => {
  const now = dayjs();
  return (
    (minutesFromCivilMidnight(now, timeZone) /
      civilDayLengthMinutes(now, timeZone)) *
    100
  );
};

// Scrolls the current time to just below the viewport top, not flush with
// it, so the now-line isn't hidden behind the header.
export const SCROLL_TO_NOW_BUFFER_PX = 150;

const SCROLL_TO_NOW_TOLERANCE_PX = 2;

export const getScrollToNowTop = (clientHeight: number) =>
  Math.max(
    0,
    getCurrentMinute() * getMinuteHeight(clientHeight) -
      SCROLL_TO_NOW_BUFFER_PX,
  );

const getScrollToNowDelta = (timedGrid: HTMLElement) => {
  const targetTop = getScrollToNowTop(timedGrid.clientHeight);
  return Math.abs(timedGrid.scrollTop - targetTop);
};

export const isTimedGridScrolledToNow = (timedGrid: HTMLElement) => {
  return getScrollToNowDelta(timedGrid) <= SCROLL_TO_NOW_TOLERANCE_PX;
};

/** Whether the live now line sits inside the timed grid's visible scroll area. */
export const isNowLineInTimedGridViewport = (timedGrid: HTMLElement) => {
  const nowLineY = getCurrentMinute() * getMinuteHeight(timedGrid.clientHeight);
  const viewTop = timedGrid.scrollTop;
  const viewBottom = viewTop + timedGrid.clientHeight;
  return nowLineY >= viewTop && nowLineY <= viewBottom;
};

/** Returns true when the grid scroll position changed. */
export const scrollTimedGridToNow = (
  timedGrid: HTMLElement,
  behavior: ScrollBehavior = "smooth",
) => {
  const targetTop = getScrollToNowTop(timedGrid.clientHeight);
  if (isTimedGridScrolledToNow(timedGrid)) return false;

  timedGrid.scroll({ behavior, top: targetTop });
  return true;
};

// #mainGrid/#allDayRow are <section> elements, not <div>s, so an
// HTMLDivElement-only check made every lookup on them return null and
// silently no-op event listeners (drag never started). Widened to accept
// any element.
export const getElemById = (id: string): HTMLElement | null => {
  const element = document.getElementById(id);

  return element instanceof HTMLElement ? element : null;
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
  return prevDayFlex * AFTER_TMRW_MULTIPLE;
};

export const getLineClamp = (height: number) =>
  Math.max(
    1,
    Math.round(
      (height - GRID_EVENT_TITLE_VERTICAL_SLACK_PX) /
        GRID_EVENT_TITLE_LINE_HEIGHT_PX,
    ),
  );

export const getPrevDayWidth = (today: Dayjs) => {
  const todayWeekNum = today.get("day") + 1;
  const yesterdayDayNum = todayWeekNum - 1;
  const futureDays = 5 - yesterdayDayNum; // 5 cuz exclude today and tmrw
  const futureFactor = futureDays * AFTER_TMRW_MULTIPLE;
  const diff = yesterdayDayNum + futureFactor;
  const width = 60 / diff;

  return width;
};

// Shifts day-of-year numbers from the start of the year onto the end of the
// previous one, so an event that crosses New Year still compares against its
// neighbors. Doesn't support events longer than 365/6 days.
const normalizeDayNums = (days: number[]) =>
  days.map((day) => (day < 365 ? day + 365 : day));

const _anySharedValues = (arr1: number[], arr2: number[]) =>
  arr1.some((value) => arr2.includes(value));

const _noOverlaps = (eventDays: number[], occupiedDays: number[]) =>
  !_anySharedValues(eventDays, occupiedDays) &&
  !_anySharedValues(
    normalizeDayNums(eventDays),
    normalizeDayNums(occupiedDays),
  );
