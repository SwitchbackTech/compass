import { type EventColorSlot } from "@core/types/event-color.contracts";

/**
 * Ephemeral state for the Shortcut Showcase's practice calendar. Nothing here
 * touches storage, queries, or the real grid stores: the blocks exist only
 * while the takeover is mounted, so every transition can be a plain pure
 * function with no side effects.
 */

export type PracticeEventBlock = {
  id: string;
  title: string;
  /** 0-2, left to right. */
  dayIndex: number;
  /** Minutes from midnight. */
  startMin: number;
  endMin: number;
  color?: EventColorSlot;
  /** Letter shown while event-jump hints are visible. */
  jumpKey: string;
};

export type PracticeNudgeDirection = "up" | "down" | "left" | "right";

export type PracticeJumpTarget = {
  digit: string;
  id: "lesson" | "calendar";
  label: string;
};

export type PracticeState = {
  events: PracticeEventBlock[];
  focusedId: string | null;
  /** Open title editor; `isNew` marks the create-step draft. */
  editor: { eventId: string; isNew: boolean } | null;
  jumpHintsVisible: boolean;
  /** `e` leader is armed; `t` opens the title field. */
  editArmed: boolean;
};

export const SHOWCASE_GRID_START_HOUR = 8;
export const SHOWCASE_GRID_END_HOUR = 18;
export const SHOWCASE_DAY_COUNT = 3;
export const PRACTICE_NUDGE_MIN = 15;
export const PRACTICE_TEAM_SYNC_ID = "practice-team-sync";

export const PRACTICE_JUMP_TARGETS: readonly PracticeJumpTarget[] = [
  { digit: "1", id: "lesson", label: "Lesson" },
  { digit: "2", id: "calendar", label: "Calendar" },
];

const PRACTICE_DRAFT_ID = "practice-draft";
const GRID_START_MIN = SHOWCASE_GRID_START_HOUR * 60;
const GRID_END_MIN = SHOWCASE_GRID_END_HOUR * 60;

export const initialPracticeState: PracticeState = {
  events: [
    {
      id: "practice-breakfast",
      title: "Breakfast with Sam",
      dayIndex: 0,
      startMin: 9 * 60,
      endMin: 10 * 60,
      jumpKey: "a",
    },
    {
      id: PRACTICE_TEAM_SYNC_ID,
      title: "Team sync",
      dayIndex: 1,
      startMin: 10 * 60,
      endMin: 11 * 60,
      color: "blue",
      jumpKey: "f",
    },
    {
      id: "practice-gym",
      title: "Gym",
      dayIndex: 2,
      startMin: 12 * 60,
      endMin: 12 * 60 + 45,
      color: "green",
      jumpKey: "g",
    },
  ],
  focusedId: null,
  editor: null,
  jumpHintsVisible: false,
  editArmed: false,
};

export const createDraft = (state: PracticeState): PracticeState => {
  if (state.editor) return state;
  const draft: PracticeEventBlock = {
    id: PRACTICE_DRAFT_ID,
    title: "",
    dayIndex: 1,
    startMin: 13 * 60,
    endMin: 14 * 60,
    jumpKey: "n",
  };
  return {
    ...state,
    events: [...state.events.filter((event) => event.id !== draft.id), draft],
    focusedId: draft.id,
    editor: { eventId: draft.id, isNew: true },
    editArmed: false,
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
  return { ...state, events, editor: null, editArmed: false };
};

export const toggleJumpHints = (state: PracticeState): PracticeState => ({
  ...state,
  jumpHintsVisible: !state.jumpHintsVisible,
});

export const jumpToEvent = (
  state: PracticeState,
  jumpKey: string,
): PracticeState => {
  if (!state.jumpHintsVisible) return state;
  const match = state.events.find(
    (event) => event.jumpKey === jumpKey.toLowerCase(),
  );
  if (!match) return state;
  return { ...state, focusedId: match.id, jumpHintsVisible: false };
};

export const ensureFocused = (state: PracticeState): PracticeState => {
  if (
    state.focusedId &&
    state.events.some((event) => event.id === state.focusedId)
  ) {
    return state;
  }
  const fallback =
    state.events.find((event) => event.id === PRACTICE_TEAM_SYNC_ID) ??
    state.events[0];
  if (!fallback) return state;
  return { ...state, focusedId: fallback.id };
};

export const nudgeFocused = (
  state: PracticeState,
  direction: PracticeNudgeDirection,
): PracticeState => {
  const focused = ensureFocused(state);
  if (!focused.focusedId) return state;

  let moved = false;
  const events = focused.events.map((event) => {
    if (event.id !== focused.focusedId) return event;
    if (direction === "left" || direction === "right") {
      const dayIndex = Math.max(
        0,
        Math.min(
          SHOWCASE_DAY_COUNT - 1,
          event.dayIndex + (direction === "right" ? 1 : -1),
        ),
      );
      if (dayIndex === event.dayIndex) return event;
      moved = true;
      return { ...event, dayIndex };
    }
    const duration = event.endMin - event.startMin;
    const delta =
      direction === "down" ? PRACTICE_NUDGE_MIN : -PRACTICE_NUDGE_MIN;
    const startMin = Math.max(
      GRID_START_MIN,
      Math.min(GRID_END_MIN - duration, event.startMin + delta),
    );
    if (startMin === event.startMin) return event;
    moved = true;
    return { ...event, startMin, endMin: startMin + duration };
  });

  if (!moved) return focused === state ? state : focused;
  return { ...focused, events };
};

export const armEdit = (state: PracticeState): PracticeState => {
  const focused = ensureFocused(state);
  if (!focused.focusedId || focused.editor) return state;
  return { ...focused, editArmed: true };
};

export const openTitleFromEdit = (state: PracticeState): PracticeState => {
  if (!state.editArmed || !state.focusedId) return state;
  return {
    ...state,
    editArmed: false,
    editor: { eventId: state.focusedId, isNew: false },
  };
};

export const disarmEdit = (state: PracticeState): PracticeState =>
  state.editArmed ? { ...state, editArmed: false } : state;
