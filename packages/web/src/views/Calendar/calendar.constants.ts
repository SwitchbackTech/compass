/* Miscellaneous */
export const EVENT_DEFAULT_MIN = 30;
export const MYSTERY_PADDING = 20; // not sure how this was determined

export const SIDEBAR_COLLAPSED_WIDTH = 44;

/*
Values used to calculate:
  - Sidebar
  - X & Y offsets
*/
export const CALENDAR_TOP_PADDING = 45;
export const CALENDAR_X_PADDING = 25;
export const CALENDAR_GRID_MARGIN_LEFT = 50;
export const CALENDAR_HEADER_HEIGHT = 68;
export const SIDEBAR_WIDTH = 350;
export const WEEK_DAYS_HEIGHT = 26;
export const WEEK_DAYS_MARGIN_Y = 22;

export const CALENDAR_X_START = CALENDAR_X_PADDING + CALENDAR_GRID_MARGIN_LEFT;
export const CALENDAR_SIDEBAR_X_START = SIDEBAR_WIDTH + CALENDAR_X_START;

export const CALENDAR_Y_START =
  CALENDAR_TOP_PADDING +
  CALENDAR_HEADER_HEIGHT +
  WEEK_DAYS_HEIGHT +
  WEEK_DAYS_MARGIN_Y;
