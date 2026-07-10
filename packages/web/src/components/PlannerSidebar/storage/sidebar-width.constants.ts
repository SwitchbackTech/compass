export const SIDEBAR_DEFAULT_WIDTH = 285;
export const SIDEBAR_MIN_WIDTH = 240;
export const SIDEBAR_MAX_WIDTH = 480;
// Matches the resize-handle column width shared with the task-list divider.
export const SIDEBAR_DIVIDER_WIDTH = 32;

export const clampSidebarWidth = (width: number) =>
  Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));
