import { type EventColorSlot } from "@core/types/event-color.contracts";
import { clamp } from "@web/grid/interaction/math/snap";
import { assignDayJumpKeys } from "@web/shortcuts/shift-hint/assign-shift-hint-keys";

/**
 * Ephemeral state for the Shortcut Showcase's practice calendar. Nothing here
 * touches storage, queries, or the real grid stores: the blocks exist only
 * while the takeover is mounted, so every transition can be a plain pure
 * function with no side effects.
 */

export type PracticeEdge = "start" | "end" | null;

export type PracticeEventBlock = {
  id: string;
  title: string;
  /** 0-2, left to right. */
  dayIndex: number;
  /** Minutes from midnight. */
  startMin: number;
  endMin: number;
  color?: EventColorSlot;
};

export type PracticeState = {
  events: PracticeEventBlock[];
  focusedId: string | null;
  edge: PracticeEdge;
  /** Open title editor; `isNew` marks the create-step draft. */
  editor: { eventId: string; isNew: boolean } | null;
  /** eventId -> jump letter while the S chips are showing. */
  jumpChips: Record<string, string> | null;
  hardcoreOn: boolean;
  past: PracticeEventBlock[][];
  future: PracticeEventBlock[][];
};

export const SHOWCASE_GRID_START_HOUR = 8;
export const SHOWCASE_GRID_END_HOUR = 18;
export const SHOWCASE_DAY_COUNT = 3;

const GRID_START_MIN = SHOWCASE_GRID_START_HOUR * 60;
const GRID_END_MIN = SHOWCASE_GRID_END_HOUR * 60;
const NUDGE_MIN = 15;
const MIN_DURATION_MIN = 15;

const PRACTICE_DRAFT_ID = "practice-draft";
export const PRACTICE_PLACED_ID = "practice-placed";

export const initialPracticeState: PracticeState = {
  events: [
    {
      id: "practice-breakfast",
      title: "Breakfast with Sam",
      dayIndex: 0,
      startMin: 9 * 60,
      endMin: 10 * 60,
    },
    {
      id: "practice-team-sync",
      title: "Team sync",
      dayIndex: 1,
      startMin: 10 * 60,
      endMin: 11 * 60,
      color: "blue",
    },
    {
      id: "practice-gym",
      title: "Gym",
      dayIndex: 2,
      startMin: 12 * 60,
      endMin: 12 * 60 + 45,
      color: "green",
    },
  ],
  focusedId: null,
  edge: null,
  editor: null,
  jumpChips: null,
  hardcoreOn: false,
  past: [],
  future: [],
};

export type PracticeDirection = "up" | "down" | "left" | "right";

/** Snapshot events into `past` before a committed change; redo dies here. */
const withHistory = (
  state: PracticeState,
  events: PracticeEventBlock[],
): PracticeState => ({
  ...state,
  events,
  past: [...state.past, state.events],
  future: [],
});

export const createDraft = (state: PracticeState): PracticeState => {
  if (state.editor) return state;
  const draft: PracticeEventBlock = {
    id: PRACTICE_DRAFT_ID,
    title: "",
    dayIndex: 1,
    startMin: 13 * 60,
    endMin: 14 * 60,
  };
  return {
    ...state,
    events: [...state.events.filter((e) => e.id !== draft.id), draft],
    focusedId: draft.id,
    editor: { eventId: draft.id, isNew: true },
    edge: null,
  };
};

export const commitTitle = (
  state: PracticeState,
  title: string,
): PracticeState => {
  if (!state.editor) return state;
  const { eventId } = state.editor;
  const events = state.events.map((event) =>
    event.id === eventId
      ? { ...event, title: title.trim() || "New event" }
      : event,
  );
  return { ...withHistory(state, events), editor: null };
};

export const openTitleEditor = (state: PracticeState): PracticeState => {
  if (!state.focusedId || state.editor) return state;
  return { ...state, editor: { eventId: state.focusedId, isNew: false } };
};

/**
 * Arrow focus traversal: up/down walk the focused day chronologically,
 * left/right hop to the nearest-in-time event on an adjacent day. Nothing
 * focused focuses the first block. Deliberately simpler than the real grid's
 * spatial targeting; the habit being taught is "arrows move focus".
 */
export const moveFocus = (
  state: PracticeState,
  direction: PracticeDirection,
): PracticeState => {
  const ordered = [...state.events].sort(
    (a, b) => a.dayIndex - b.dayIndex || a.startMin - b.startMin,
  );
  if (ordered.length === 0) return state;
  const current = ordered.find((event) => event.id === state.focusedId);
  if (!current) {
    return { ...state, focusedId: ordered[0].id, edge: null };
  }

  let next: PracticeEventBlock | undefined;
  if (direction === "up" || direction === "down") {
    const sameDay = ordered.filter((e) => e.dayIndex === current.dayIndex);
    const index = sameDay.findIndex((e) => e.id === current.id);
    next = sameDay[direction === "up" ? index - 1 : index + 1];
  } else {
    const targetDay = current.dayIndex + (direction === "left" ? -1 : 1);
    const candidates = ordered.filter((e) => e.dayIndex === targetDay);
    next = candidates.sort(
      (a, b) =>
        Math.abs(a.startMin - current.startMin) -
        Math.abs(b.startMin - current.startMin),
    )[0];
  }
  if (!next) return state;
  return { ...state, focusedId: next.id, edge: null };
};

export const moveFocusedEvent = (
  state: PracticeState,
  direction: PracticeDirection,
): PracticeState => {
  const event = state.events.find((e) => e.id === state.focusedId);
  if (!event) return state;

  let { dayIndex, startMin, endMin } = event;
  const duration = endMin - startMin;
  if (direction === "left" || direction === "right") {
    dayIndex = clamp(
      dayIndex + (direction === "left" ? -1 : 1),
      0,
      SHOWCASE_DAY_COUNT - 1,
    );
  } else {
    const delta = direction === "up" ? -NUDGE_MIN : NUDGE_MIN;
    startMin = clamp(startMin + delta, GRID_START_MIN, GRID_END_MIN - duration);
    endMin = startMin + duration;
  }
  if (
    dayIndex === event.dayIndex &&
    startMin === event.startMin &&
    endMin === event.endMin
  ) {
    return state;
  }
  const events = state.events.map((e) =>
    e.id === event.id ? { ...e, dayIndex, startMin, endMin } : e,
  );
  return withHistory(state, events);
};

export const cycleEdge = (state: PracticeState): PracticeState => {
  if (!state.focusedId) return state;
  const next: PracticeEdge =
    state.edge === null ? "start" : state.edge === "start" ? "end" : null;
  return { ...state, edge: next };
};

export const setEdge = (
  state: PracticeState,
  edge: PracticeEdge,
): PracticeState => ({ ...state, edge });

export const resizeFocusedEdge = (
  state: PracticeState,
  direction: PracticeDirection,
): PracticeState => {
  const event = state.events.find((e) => e.id === state.focusedId);
  if (!event || !state.edge || direction === "left" || direction === "right") {
    return state;
  }
  const delta = direction === "up" ? -NUDGE_MIN : NUDGE_MIN;
  let { startMin, endMin } = event;
  if (state.edge === "start") {
    startMin = clamp(
      startMin + delta,
      GRID_START_MIN,
      endMin - MIN_DURATION_MIN,
    );
  } else {
    endMin = clamp(endMin + delta, startMin + MIN_DURATION_MIN, GRID_END_MIN);
  }
  if (startMin === event.startMin && endMin === event.endMin) return state;
  const events = state.events.map((e) =>
    e.id === event.id ? { ...e, startMin, endMin } : e,
  );
  return withHistory(state, events);
};

/**
 * Chips use the real event-jump labeler so practice keys match what the S
 * flow shows in the actual calendar (day prefix + index: "m1", "t2"). The
 * practice days are Mon/Tue/Wed, so weekday = dayIndex + 1.
 */
export const toggleJumpChips = (state: PracticeState): PracticeState => {
  if (state.jumpChips) return { ...state, jumpChips: null };
  const assignments = assignDayJumpKeys(
    state.events.map((event) => ({
      eventId: event.id,
      startMs: event.startMin,
      eventType: "timed" as const,
      dayKey: `day-${event.dayIndex}`,
      weekday: event.dayIndex + 1,
    })),
    "week",
  );
  const chips: Record<string, string> = {};
  for (const assignment of assignments) {
    chips[assignment.eventId] = assignment.hint;
  }
  return { ...state, jumpChips: chips };
};

export const jumpToChipHint = (
  state: PracticeState,
  hint: string,
): PracticeState => {
  if (!state.jumpChips) return state;
  const match = Object.entries(state.jumpChips).find(
    ([, chipHint]) => chipHint === hint.toLowerCase(),
  );
  if (!match) return state;
  return { ...state, focusedId: match[0], jumpChips: null, edge: null };
};

/** Focus the chronologically first block when nothing is focused. */
export const focusFallback = (state: PracticeState): PracticeState => {
  if (state.focusedId) return state;
  const first = [...state.events].sort(
    (a, b) => a.dayIndex - b.dayIndex || a.startMin - b.startMin,
  )[0];
  return first ? { ...state, focusedId: first.id } : state;
};

export const clearFocus = (state: PracticeState): PracticeState => ({
  ...state,
  focusedId: null,
  edge: null,
});

export const placeDraft = (state: PracticeState): PracticeState => {
  const placed: PracticeEventBlock = {
    id: PRACTICE_PLACED_ID,
    title: "Focus time",
    dayIndex: 1,
    startMin: 15 * 60,
    endMin: 16 * 60,
    color: "slate",
  };
  const events = [...state.events.filter((e) => e.id !== placed.id), placed];
  return { ...withHistory(state, events), focusedId: placed.id, edge: null };
};

export const undo = (state: PracticeState): PracticeState => {
  const previous = state.past[state.past.length - 1];
  if (!previous) return state;
  return {
    ...state,
    events: previous,
    past: state.past.slice(0, -1),
    future: [...state.future, state.events],
    // Focus may point at an undone block; clearing beats a dangling ring.
    focusedId: previous.some((e) => e.id === state.focusedId)
      ? state.focusedId
      : null,
    edge: null,
  };
};

export const redo = (state: PracticeState): PracticeState => {
  const next = state.future[state.future.length - 1];
  if (!next) return state;
  return {
    ...state,
    events: next,
    past: [...state.past, state.events],
    future: state.future.slice(0, -1),
  };
};

export const toggleHardcore = (state: PracticeState): PracticeState => ({
  ...state,
  hardcoreOn: !state.hardcoreOn,
});
