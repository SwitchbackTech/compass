import {
  armEdit,
  commitTitle,
  createDraft,
  ensureFocused,
  initialPracticeState,
  jumpToEvent,
  nudgeFocused,
  openTitleFromEdit,
  PRACTICE_TEAM_SYNC_ID,
  toggleJumpHints,
} from "@web/components/ShortcutShowcase/practice.state";
import { describe, expect, it } from "bun:test";

describe("practice state transitions", () => {
  it("creates a draft with an open editor and commits the typed title", () => {
    const drafted = createDraft(initialPracticeState);
    expect(drafted.editor?.isNew).toBe(true);
    expect(drafted.focusedId).toBe(drafted.editor?.eventId ?? "");

    const saved = commitTitle(drafted, "Coffee with Alex");
    expect(saved.editor).toBeNull();
    expect(
      saved.events.find((e) => e.id === drafted.editor?.eventId)?.title,
    ).toBe("Coffee with Alex");
  });

  it("falls back to a default title when the commit is empty", () => {
    const saved = commitTitle(createDraft(initialPracticeState), "   ");
    expect(saved.events.find((e) => e.id === "practice-draft")?.title).toBe(
      "New event",
    );
  });

  it("does not stack a second draft while the editor is open", () => {
    const drafted = createDraft(initialPracticeState);
    expect(createDraft(drafted)).toBe(drafted);
  });

  it("ignores a title commit when no editor is open", () => {
    expect(commitTitle(initialPracticeState, "nope")).toBe(
      initialPracticeState,
    );
  });

  it("jumps to an event only while letter hints are visible", () => {
    expect(jumpToEvent(initialPracticeState, "f")).toBe(initialPracticeState);

    const hinted = toggleJumpHints(initialPracticeState);
    expect(hinted.jumpHintsVisible).toBe(true);

    const jumped = jumpToEvent(hinted, "f");
    expect(jumped.focusedId).toBe(PRACTICE_TEAM_SYNC_ID);
    expect(jumped.jumpHintsVisible).toBe(false);
  });

  it("nudges the focused event to a neighboring day", () => {
    const focused = ensureFocused(initialPracticeState);
    const team = focused.events.find((event) => event.id === focused.focusedId);
    expect(team).toBeTruthy();

    const moved = nudgeFocused(focused, "right");
    const next = moved.events.find((event) => event.id === focused.focusedId);
    expect(next?.dayIndex).toBe((team?.dayIndex ?? 0) + 1);
  });

  it("opens the title field from an armed edit sequence", () => {
    const focused = ensureFocused(initialPracticeState);
    const armed = armEdit(focused);
    expect(armed.editArmed).toBe(true);

    const opened = openTitleFromEdit(armed);
    expect(opened.editor?.eventId).toBe(focused.focusedId);
    expect(opened.editor?.isNew).toBe(false);
    expect(opened.editArmed).toBe(false);
  });
});
