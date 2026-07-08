import { type Schema_Event } from "@core/types/event.types";
import {
  isRestoringHistory,
  runHistoryRestore,
  type UndoHistoryEntry,
  undoHistoryActions,
  useUndoHistoryStore,
} from "./undo.store";
import { describe, expect, it } from "bun:test";

const event = (id: string): Schema_Event => ({ _id: id, title: id });

const editEntry = (id: string): UndoHistoryEntry => ({
  kind: "edit",
  _id: id,
  before: event(id),
  after: { ...event(id), title: `${id}-moved` },
});

describe("undoHistoryActions", () => {
  it("records entries and clears the redo stack", () => {
    undoHistoryActions.record(editEntry("a"));
    undoHistoryActions.popUndo();
    expect(useUndoHistoryStore.getState().future).toHaveLength(1);

    undoHistoryActions.record(editEntry("b"));

    const { past, future } = useUndoHistoryStore.getState();
    expect(past.map((e) => (e.kind === "edit" ? e._id : null))).toEqual(["b"]);
    expect(future).toHaveLength(0);
  });

  it("caps history at 30 entries, dropping the oldest", () => {
    for (let i = 0; i < 35; i++) {
      undoHistoryActions.record(editEntry(`e${i}`));
    }

    const { past } = useUndoHistoryStore.getState();
    expect(past).toHaveLength(30);
    expect(past[0]).toMatchObject({ _id: "e5" });
    expect(past.at(-1)).toMatchObject({ _id: "e34" });
  });

  it("moves entries between stacks on popUndo/popRedo", () => {
    undoHistoryActions.record(editEntry("a"));
    undoHistoryActions.record({ kind: "delete", event: event("b") });

    const undone = undoHistoryActions.popUndo();
    expect(undone).toMatchObject({ kind: "delete" });
    expect(useUndoHistoryStore.getState().past).toHaveLength(1);
    expect(useUndoHistoryStore.getState().future).toHaveLength(1);

    const redone = undoHistoryActions.popRedo();
    expect(redone).toBe(undone);
    expect(useUndoHistoryStore.getState().past).toHaveLength(2);
    expect(useUndoHistoryStore.getState().future).toHaveLength(0);
  });

  it("returns null when popping empty stacks", () => {
    expect(undoHistoryActions.popUndo()).toBeNull();
    expect(undoHistoryActions.popRedo()).toBeNull();
  });
});

describe("runHistoryRestore", () => {
  it("sets the restoring flag only for the duration of the callback", () => {
    expect(isRestoringHistory()).toBe(false);

    runHistoryRestore(() => {
      expect(isRestoringHistory()).toBe(true);
    });

    expect(isRestoringHistory()).toBe(false);
  });

  it("resets the flag when the callback throws", () => {
    expect(() =>
      runHistoryRestore(() => {
        throw new Error("boom");
      }),
    ).toThrow("boom");

    expect(isRestoringHistory()).toBe(false);
  });
});
