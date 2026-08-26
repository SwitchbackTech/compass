import { expandModInShortcutDisplay } from "@web/shortcuts/shortcut.util";
import {
  getHintPlainText,
  getPartsPlainText,
  SHORTCUT_HINTS,
} from "@web/shortcuts/tips/shortcut-tips.data";
import { describe, expect, it } from "bun:test";

describe("getHintPlainText", () => {
  it("reconstitutes each hint's full sentence from its parts", () => {
    const plainTextById = Object.fromEntries(
      Object.values(SHORTCUT_HINTS).map((hint) => [
        hint.id,
        getHintPlainText(hint),
      ]),
    );
    const mod = expandModInShortcutDisplay("Mod") === "Meta" ? "Cmd" : "Ctrl";

    expect(plainTextById["first-event-save"]).toBe("Type a title, then Enter");
    expect(plainTextById["save-draft"]).toBe(
      `Enter to save · hold ${mod} to jump fields`,
    );
    expect(plainTextById["life-this-week"]).toBe(
      "Press T to jump to this week",
    );
    expect(plainTextById["edit-sequence"]).toBe(
      "Press E then T to jump to the title",
    );
    expect(plainTextById["create-event"]).toBe("Press C to add an event");
    expect(plainTextById["page-jump"]).toBe(
      `Hold ${mod} to see where you can jump`,
    );
  });

  it("joins a chord's keys with + and speaks Mod as Cmd or Ctrl", () => {
    const mod = expandModInShortcutDisplay("Mod") === "Meta" ? "Cmd" : "Ctrl";
    expect(
      getPartsPlainText([
        "Press ",
        { keys: ["Mod", "Z"] },
        " then ",
        { keys: ["Mod", "Shift", "Z"] },
      ]),
    ).toBe(`Press ${mod}+Z then ${mod}+Shift+Z`);
  });
});
