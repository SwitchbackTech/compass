export const TASK_LIST_DEFAULT_WIDTH = 360;
export const TASK_LIST_MIN_WIDTH = 240;
export const TASK_LIST_MAX_WIDTH = 600;

export const clampTaskListWidth = (width: number) =>
  Math.min(TASK_LIST_MAX_WIDTH, Math.max(TASK_LIST_MIN_WIDTH, width));
