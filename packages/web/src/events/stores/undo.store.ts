import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { type Schema_Event } from "@core/types/event.types";
import { IS_DEV } from "@web/common/constants/env.constants";

/**
 * One undoable event change. Edits and converts keep full before/after
 * snapshots so undo/redo are symmetric `edit` replays; deletes keep the
 * full event (provider ids included) so undo can recreate it with the
 * same Compass `_id` and Google event id.
 */
export type UndoHistoryEntry =
  | {
      kind: "edit" | "convert-to-someday" | "convert-to-calendar";
      _id: string;
      before: Schema_Event;
      after: Schema_Event;
    }
  | { kind: "delete" | "delete-someday"; event: Schema_Event };

export interface State_UndoHistory {
  past: UndoHistoryEntry[];
  future: UndoHistoryEntry[];
}

export const initialUndoHistoryState: State_UndoHistory = {
  past: [],
  future: [],
};

const MAX_HISTORY = 30;

// Selectors passed to this hook must return primitives or stable references;
// a selector that builds a new object/array each call needs `useShallow`.
export const useUndoHistoryStore = create<State_UndoHistory>()(
  devtools(() => initialUndoHistoryState, {
    name: "compass/undo-history",
    enabled: IS_DEV,
  }),
);

// Guard against undo/redo replays recording themselves as new history.
// Module-level rather than store state because it's transient and only ever
// checked synchronously within the same tick as the replay `.mutate()` calls.
let restoring = false;

export const isRestoringHistory = () => restoring;

export const runHistoryRestore = (fn: () => void) => {
  restoring = true;
  try {
    fn();
  } finally {
    restoring = false;
  }
};

export const undoHistoryActions = {
  record: (entry: UndoHistoryEntry) =>
    useUndoHistoryStore.setState(
      (state) => ({
        past: [...state.past, entry].slice(-MAX_HISTORY),
        future: [],
      }),
      false,
      { type: "record" },
    ),

  popUndo: (): UndoHistoryEntry | null => {
    const { past, future } = useUndoHistoryStore.getState();
    const entry = past.at(-1);
    if (!entry) return null;

    useUndoHistoryStore.setState(
      { past: past.slice(0, -1), future: [...future, entry] },
      false,
      { type: "popUndo" },
    );
    return entry;
  },

  popRedo: (): UndoHistoryEntry | null => {
    const { past, future } = useUndoHistoryStore.getState();
    const entry = future.at(-1);
    if (!entry) return null;

    useUndoHistoryStore.setState(
      { past: [...past, entry], future: future.slice(0, -1) },
      false,
      { type: "popRedo" },
    );
    return entry;
  },
};

export const selectCanUndo = (state: State_UndoHistory) =>
  state.past.length > 0;

export const selectCanRedo = (state: State_UndoHistory) =>
  state.future.length > 0;
