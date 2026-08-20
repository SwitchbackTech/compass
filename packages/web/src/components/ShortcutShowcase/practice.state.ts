import { type EventColorSlot } from "@core/types/event-color.contracts";

/**
 * Ephemeral state for the Shortcut Showcase's practice calendar. Nothing here
 * touches storage, queries, or the real grid stores: the blocks exist only
 * while the takeover is mounted, so every transition can be a plain pure
 * function with no side effects.
 *
 * Only the one gating lesson lives here (create a draft, then title-and-save
 * as one continuous motion). Graduation hands off to a prompt on the real
 * calendar, not a checklist that reimplements jump, move, stretch, place and
 * undo.
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
};

export type PracticeState = {
  events: PracticeEventBlock[];
  focusedId: string | null;
  /** Open title editor; `isNew` marks the create-step draft. */
  editor: { eventId: string; isNew: boolean } | null;
};

export const SHOWCASE_GRID_START_HOUR = 8;
export const SHOWCASE_GRID_END_HOUR = 18;
export const SHOWCASE_DAY_COUNT = 3;

const PRACTICE_DRAFT_ID = "practice-draft";

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
  editor: null,
};

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
  return { ...state, events, editor: null };
};
