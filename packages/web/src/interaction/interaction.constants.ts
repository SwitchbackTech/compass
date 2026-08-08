/**
 * Shared gesture timings for grid interaction.
 *
 * `INTERACTION_MOVE_THRESHOLD_PX` (25) gates motion on an existing event/draft —
 * the pointer must clearly intend a drag before the card moves.
 * `TIMED_DRAFT_CREATE_MOVE_THRESHOLD_PX` (4) is intentionally tighter: on empty
 * grid it distinguishes a click-to-create from a drag-to-resize-duration. Do
 * not unify these values; they measure different products of the gesture.
 *
 * `INTERACTION_EDGE_THRESHOLD_PX` is the shared proximity band for Day/Week
 * smart-scroll and Week edge-navigation — same distance, different axes.
 */
export const INTERACTION_HOLD_DELAY_MS = 750;
export const INTERACTION_MOVE_THRESHOLD_PX = 25;
export const INTERACTION_COMMIT_TEARDOWN_DEADLINE_MS = 250;
export const INTERACTION_EDGE_THRESHOLD_PX = 50;
export const TIMED_DRAFT_CREATE_MOVE_THRESHOLD_PX = 4;
