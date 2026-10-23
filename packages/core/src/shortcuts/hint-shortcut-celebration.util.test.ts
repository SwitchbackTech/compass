import {
  firstHintShortcutCelebrationKey,
  hintShortcutCelebrationKeyAtPartIndex,
  listHintShortcutCelebrationKeys,
  mergeHintShortcutCelebrationKeys,
} from "@core/shortcuts/hint-shortcut-celebration.util";
import { describe, expect, it } from "bun:test";

describe("hintShortcutCelebrationKey", () => {
  const gridScrollParts = [
    { keys: ["Alt", "ArrowDown"] as const },
    " scrolls · ",
    { key: "PageDown" },
  ] as const;

  it("lists one celebration key per keycap group", () => {
    expect(
      listHintShortcutCelebrationKeys("grid-scroll", gridScrollParts),
    ).toEqual(["grid-scroll:alt+arrowdown", "grid-scroll:pagedown"]);
  });

  it("addresses a part by index", () => {
    expect(
      hintShortcutCelebrationKeyAtPartIndex("grid-scroll", gridScrollParts, 2),
    ).toBe("grid-scroll:pagedown");
  });

  it("returns the first key group for a hint", () => {
    expect(
      firstHintShortcutCelebrationKey("grid-scroll", gridScrollParts),
    ).toBe("grid-scroll:alt+arrowdown");
  });

  it("merges device and account sets without duplicates", () => {
    expect(
      mergeHintShortcutCelebrationKeys(
        ["grid-scroll:pagedown"],
        ["grid-scroll:pagedown", "week-nav:j"],
      ),
    ).toEqual(["grid-scroll:pagedown", "week-nav:j"]);
  });
});
