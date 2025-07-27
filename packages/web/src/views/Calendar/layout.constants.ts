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
export const EVENT_WIDTH_MINIMUM = 80;

export const FLEX_TODAY = 21.4;
export const FLEX_TMRW = 18.6;
export const FLEX_EQUAL = 14.285714285714286; // 100 / 7
export const HEADER_HEIGHT = 40;

export const PAGE_MARGIN_TOP = 35;
export const PAGE_MARGIN_X = 25;

export const SCROLLBAR_WIDTH = 8;

export const WEEK_DAYS_HEIGHT = 26;
export const WEEK_DAYS_MARGIN_Y = 22;

export const GRID_PADDING_BOTTOM = 20;
export const GRID_MARGIN_LEFT = 50;
export const GRID_TIME_STEP = 15;
export const GRID_X_START = PAGE_MARGIN_X + GRID_MARGIN_LEFT;
export const GRID_Y_START =
  PAGE_MARGIN_TOP + HEADER_HEIGHT + WEEK_DAYS_HEIGHT + WEEK_DAYS_MARGIN_Y;
export const GRID_X_PADDING_TOTAL =
  PAGE_MARGIN_X * 2 + GRID_MARGIN_LEFT + SCROLLBAR_WIDTH;

export const SIDEBAR_MONTH_HEIGHT = 275;
export const SIDEBAR_OPEN_WIDTH = 350;
export const SIDEBAR_X_START = SIDEBAR_OPEN_WIDTH + GRID_X_START;
