import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { type Event } from "@core/types/event.contracts";
import { IS_DEV } from "@web/common/constants/env.constants";

/**
 * One undoable event change. Edits keep full before/after snapshots so
 * undo/redo are symmetric `replace` replays; deletes keep the full event so
 * undo can recreate it with the same Compass id (A25).
 */
export type UndoHistoryEntry =
  | {
      kind: "edit";
      id: string;
      before: Event;
      after: Event;
    }
  | { kind: "delete"; event: Event };

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
