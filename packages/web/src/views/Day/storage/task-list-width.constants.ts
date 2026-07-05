export const TASK_LIST_DEFAULT_WIDTH = 360;
export const TASK_LIST_MIN_WIDTH = 240;
export const TASK_LIST_MAX_WIDTH = 600;
// Matches the resize-handle column's w-8 (2rem) in DayViewContent.
export const TASK_LIST_DIVIDER_WIDTH = 32;

export const clampTaskListWidth = (width: number) =>
  Math.min(TASK_LIST_MAX_WIDTH, Math.max(TASK_LIST_MIN_WIDTH, width));
