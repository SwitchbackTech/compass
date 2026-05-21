import { buildWeekShortcutSections } from "./weekShortcutSections";
import { describe, expect, it } from "bun:test";

describe("buildWeekShortcutSections", () => {
  it("lists calendar event targeting shortcuts", () => {
    const sections = buildWeekShortcutSections({ isCurrentWeek: true });
    const createSection = sections.find(
      (section) => section.title === "Create",
    );
    const calendarShortcuts = createSection?.shortcuts.map(
      (shortcut) => shortcut.k,
    );

    expect(calendarShortcuts).toContain("I");
    expect(calendarShortcuts).toContain("M");
  });
});
