import { buildWeekShortcutSections } from "./weekShortcutSections";
import { describe, expect, it } from "bun:test";

describe("buildWeekShortcutSections", () => {
  it("lists calendar event targeting and draft movement shortcuts", () => {
    const sections = buildWeekShortcutSections({ isCurrentWeek: true });
    const createSection = sections.find(
      (section) => section.title === "Create",
    );
    const calendarShortcuts = createSection?.shortcuts.map(
      (shortcut) => shortcut.k,
    );

    expect(calendarShortcuts).toContain("I");
    expect(calendarShortcuts).toContain("M");
    expect(createSection?.shortcuts).toContainEqual({
      k: "Arrow keys",
      label: "Move draft event",
    });
  });
});
