import { ID_SIDEBAR } from "@web/common/constants/web.constants";

export const AFTER_TMRW_MULTIPLE = 1.5;

export const DIVIDER_GRID = 1;

export const DRAFT_DURATION_MIN = 15;
export const DRAFT_PADDING_BOTTOM = 3;

export const EVENT_ALLDAY_HEIGHT = 20;
/** Gap between each allday event, found by experimenting with what 'looked right' */
export const EVENT_ALLDAY_GAP = 3;
/** Height of the row containing the all-day event. Not to be confused with `EVENT_ALLDAY_HEIGHT` */
export const EVENT_ALLDAY_ROW_HEIGHT = EVENT_ALLDAY_HEIGHT + EVENT_ALLDAY_GAP;
export const EVENT_PADDING_RIGHT = 10;
export const TIMED_EVENT_COLUMN_INSET = 5;
export const GRID_EVENT_TIME_LABEL_FONT_SIZE = "11px";
export const GRID_EVENT_TIME_LABEL_OPACITY = "0.78";
export const GRID_EVENT_TITLE_LINE_HEIGHT = "16px";
/** Minimum rendered event height (px) to show the time label below the title.
 *  Below this the label is suppressed to prevent overflow on short events.
 *  At typical hourHeight (~65px/hr): 30-min ≈ 33px (hidden), 45-min ≈ 49px (shown). */
export const MIN_EVENT_HEIGHT_FOR_TIME_LABEL = 36;
export const MIN_EVENT_WIDTH_FOR_TIME_LABEL = 90;
export const EVENT_WIDTH_MINIMUM = 80;

export const DECK_INDENT = 16;
export const DECK_RIGHT_RESERVE = 24;
export const DECK_MIN_WIDTH = 72;

export const FLEX_TODAY = 21.4;
export const FLEX_TMRW = 18.6;
export const FLEX_EQUAL = 14.285714285714286; // 100 / 7
const HEADER_HEIGHT = 40;

const PAGE_MARGIN_TOP = 35;
const PAGE_MARGIN_X = 25;

const WEEK_DAYS_HEIGHT = 26;
const WEEK_DAYS_MARGIN_Y = 22;

export const GRID_PADDING_BOTTOM = 20;
export const GRID_MARGIN_LEFT = 50;
export const GRID_TIME_STEP = 15;
export const WEEK_TIMED_VISIBLE_HOURS = 13;
export const GRID_X_START = PAGE_MARGIN_X + GRID_MARGIN_LEFT;
export const GRID_Y_START =
  PAGE_MARGIN_TOP + HEADER_HEIGHT + WEEK_DAYS_HEIGHT + WEEK_DAYS_MARGIN_Y;
export const WEEK_GRID_TRACK_MIN_WIDTH =
  GRID_MARGIN_LEFT + EVENT_WIDTH_MINIMUM * 7;

export const SIDEBAR_MONTH_HEIGHT = 275;
export const SIDEBAR_OPEN_WIDTH = 285;

export function getSidebarOpenWidth() {
  if (typeof document === "undefined") return SIDEBAR_OPEN_WIDTH;

  return (
    document.getElementById(ID_SIDEBAR)?.getBoundingClientRect().width ??
    SIDEBAR_OPEN_WIDTH
  );
}
