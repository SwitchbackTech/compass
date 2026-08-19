import {
  commitTitle,
  createDraft,
  initialPracticeState,
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
});
