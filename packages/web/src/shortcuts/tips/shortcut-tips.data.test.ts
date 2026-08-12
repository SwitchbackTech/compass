import {
  getPartsPlainText,
  getShortcutTips,
  getTipPlainText,
} from "@web/shortcuts/tips/shortcut-tips.data";
import { describe, expect, it } from "bun:test";

describe("getTipPlainText", () => {
  it("reconstitutes each tip's full sentence from its parts", () => {
    const plainTextById = Object.fromEntries(
      getShortcutTips().map((tip) => [tip.id, getTipPlainText(tip)]),
    );

    expect(plainTextById["edit-sequence"]).toBe(
      "Press E then T to jump to the title",
    );
    expect(plainTextById.nudge).toBe(
      "Hold Shift and press an arrow to move this event",
    );
    expect(plainTextById["target-event"]).toBe(
      "Tap S to jump to any visible event",
    );
    expect(plainTextById["edge-cycle"]).toBe(
      "Press Tab to move between start and end",
    );
  });

  it("joins a chord's keys with + for the accessible sentence", () => {
    expect(
      getPartsPlainText([
        "Press ",
        { keys: ["Mod", "Z"] },
        " then ",
        { keys: ["Mod", "Shift", "Z"] },
      ]),
    ).toBe("Press Mod+Z then Mod+Shift+Z");
  });
});
