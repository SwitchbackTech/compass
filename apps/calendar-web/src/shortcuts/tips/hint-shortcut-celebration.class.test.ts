import { hintShortcutCelebrationClassForPart } from "@web/shortcuts/tips/hint-shortcut-celebration.class";
import { describe, expect, it } from "bun:test";

describe("hintShortcutCelebrationClassForPart", () => {
  it("applies the accent pulse class to the active keycap group", () => {
    expect(
      hintShortcutCelebrationClassForPart(
        "grid-scroll",
        { key: "PageDown" },
        "grid-scroll:pagedown",
      ),
    ).toBe("c-keycap-next");
  });

  it("leaves other keycap groups unchanged", () => {
    expect(
      hintShortcutCelebrationClassForPart(
        "grid-scroll",
        { keys: ["Alt", "ArrowDown"] },
        "grid-scroll:pagedown",
      ),
    ).toBe("");
  });
});
