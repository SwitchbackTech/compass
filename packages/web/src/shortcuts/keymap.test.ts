import { getShowcaseStep } from "@web/components/ShortcutShowcase/showcase.steps";
import { EDIT_SEQUENCE_FIELD_BY_KEY } from "@web/shortcuts/edit-sequence/edit-sequence.fields";
import { KEYMAP } from "@web/shortcuts/keymap";
import { SHORTCUTS_REGISTRY } from "@web/shortcuts/shortcuts.registry";
import { describe, expect, it } from "bun:test";

const registryKeys = (id: string): string[] => {
  const entry = SHORTCUTS_REGISTRY.find((shortcut) => shortcut.id === id);
  if (!entry) throw new Error(`registry entry missing: ${id}`);
  return [...entry.keys];
};

/**
 * The help overlay's registry and the runtime keymap are separate modules; a
 * remap must land in both. These checks fail the moment they disagree.
 */
describe("keymap ↔ shortcuts registry parity", () => {
  it("agrees on single-key bindings", () => {
    expect(registryKeys("create-timed")[0]!.toLowerCase()).toBe(
      KEYMAP.createEvent.hotkey.toLowerCase(),
    );
    expect(registryKeys("focus-shift-hold")).toEqual([
      KEYMAP.eventJump.bareLetter,
    ]);
    expect(registryKeys("other-keyboard-only")).toEqual([
      KEYMAP.hardcore.bareLetter,
    ]);
    expect(registryKeys("edit-cycle-edge")).toEqual([KEYMAP.edgeFocus.hotkey]);
  });

  it("agrees on the edit-title sequence", () => {
    expect(registryKeys("edit-focus-title")).toEqual([
      KEYMAP.editTitle.sequence.leader,
      KEYMAP.editTitle.sequence.second,
    ]);
  });

  it("agrees on chorded bindings", () => {
    expect(registryKeys("other-undo").join("+")).toBe(KEYMAP.undo.hotkey);
    expect(registryKeys("other-redo").join("+")).toBe(KEYMAP.redo.hotkey);
  });

  it("agrees on arrow families", () => {
    expect(registryKeys("edit-focus-prev")).toEqual([
      KEYMAP.moveFocus.hotkeys.up,
    ]);
    expect(registryKeys("edit-focus-next")).toEqual([
      KEYMAP.moveFocus.hotkeys.down,
    ]);
    expect(registryKeys("edit-focus-left")).toEqual([
      KEYMAP.moveFocus.hotkeys.left,
    ]);
    expect(registryKeys("edit-focus-right")).toEqual([
      KEYMAP.moveFocus.hotkeys.right,
    ]);

    expect(registryKeys("edit-move-earlier").join("+")).toBe(
      KEYMAP.moveEvent.hotkeys.up,
    );
    expect(registryKeys("edit-move-later").join("+")).toBe(
      KEYMAP.moveEvent.hotkeys.down,
    );
    expect(registryKeys("edit-move-prev-day").join("+")).toBe(
      KEYMAP.moveEvent.hotkeys.left,
    );
    expect(registryKeys("edit-move-next-day").join("+")).toBe(
      KEYMAP.moveEvent.hotkeys.right,
    );
  });
});

describe("keymap ↔ showcase hint parity", () => {
  it("showcase hints reference the keymap's keycaps, not copies", () => {
    expect(getShowcaseStep("create").keycaps).toBe(KEYMAP.createEvent.keycaps);
    expect(getShowcaseStep("save").keycaps).toBe(KEYMAP.saveDraft.keycaps);
    expect(getShowcaseStep("moveFocus").keycaps).toBe(KEYMAP.moveFocus.keycaps);
    expect(getShowcaseStep("editTitle").keycaps).toBe(KEYMAP.editTitle.keycaps);
    expect(getShowcaseStep("eventJump").keycaps).toBe(KEYMAP.eventJump.keycaps);
    expect(getShowcaseStep("moveEvent").keycaps).toBe(KEYMAP.moveEvent.keycaps);
    expect(getShowcaseStep("resizeEdge").keycaps).toBe(
      KEYMAP.edgeFocus.keycaps,
    );
    expect(getShowcaseStep("placeDraft").keycaps).toBe(
      KEYMAP.moveEvent.keycaps,
    );
    expect(getShowcaseStep("hardcore").keycaps).toBe(KEYMAP.hardcore.keycaps);

    const undoRedoBody = getShowcaseStep("undoRedo").body;
    expect(Array.isArray(undoRedoBody)).toBe(true);
    const undoRedoChords = (
      undoRedoBody as readonly { keys?: readonly string[] }[]
    )
      .filter((part) => typeof part !== "string" && "keys" in part)
      .map((part) => part.keys);
    expect(undoRedoChords[0]).toBe(KEYMAP.undo.keycaps);
    expect(undoRedoChords[1]).toBe(KEYMAP.redo.keycaps);
  });
});

describe("keymap ↔ edit-sequence engine parity", () => {
  it("maps the taught second key to the title field", () => {
    expect(EDIT_SEQUENCE_FIELD_BY_KEY[KEYMAP.editTitle.sequence.second]).toBe(
      "title",
    );
  });
});
