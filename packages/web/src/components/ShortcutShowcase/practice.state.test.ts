import {
  clearFocus,
  commitTitle,
  createDraft,
  cycleEdge,
  initialPracticeState,
  jumpToChipHint,
  moveFocus,
  moveFocusedEvent,
  openTitleEditor,
  PRACTICE_PLACED_ID,
  placeDraft,
  redo,
  resizeFocusedEdge,
  setEdge,
  toggleHardcore,
  toggleJumpChips,
  undo,
} from "@web/components/ShortcutShowcase/practice.state";
import { describe, expect, it } from "bun:test";

const focusTeamSync = (state = initialPracticeState) => ({
  ...state,
  focusedId: "practice-team-sync",
});

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
    expect(saved.past.length).toBe(1);
  });

  it("falls back to a default title when the commit is empty", () => {
    const saved = commitTitle(createDraft(initialPracticeState), "   ");
    expect(saved.events.find((e) => e.id === "practice-draft")?.title).toBe(
      "New event",
    );
  });

  it("focuses the first block when nothing is focused, then hops days", () => {
    const first = moveFocus(initialPracticeState, "down");
    expect(first.focusedId).toBe("practice-breakfast");

    const hopped = moveFocus(first, "right");
    expect(hopped.focusedId).toBe("practice-team-sync");
    const back = moveFocus(hopped, "left");
    expect(back.focusedId).toBe("practice-breakfast");
  });

  it("moves the focused event by 15 minutes and across days, clamped", () => {
    const focused = focusTeamSync();
    const later = moveFocusedEvent(focused, "down");
    const sync = later.events.find((e) => e.id === "practice-team-sync");
    expect(sync?.startMin).toBe(10 * 60 + 15);
    expect(sync?.endMin).toBe(11 * 60 + 15);

    const shifted = moveFocusedEvent(later, "right");
    expect(
      shifted.events.find((e) => e.id === "practice-team-sync")?.dayIndex,
    ).toBe(2);
    // Already on the last day: a further right-move is a no-op, not history.
    const clamped = moveFocusedEvent(shifted, "right");
    expect(clamped).toBe(shifted);
  });

  it("cycles edge focus null -> start -> end -> null", () => {
    const focused = focusTeamSync();
    const start = cycleEdge(focused);
    expect(start.edge).toBe("start");
    const end = cycleEdge(start);
    expect(end.edge).toBe("end");
    expect(cycleEdge(end).edge).toBeNull();
  });

  it("resizes only the focused edge, keeping the other side put", () => {
    const withEdge = setEdge(focusTeamSync(), "end");
    const resized = resizeFocusedEdge(withEdge, "down");
    const sync = resized.events.find((e) => e.id === "practice-team-sync");
    expect(sync?.startMin).toBe(10 * 60);
    expect(sync?.endMin).toBe(11 * 60 + 15);
  });

  it("assigns the real day-prefix jump hints and jumps focus by hint", () => {
    const withChips = toggleJumpChips(initialPracticeState);
    // Same labeling scheme the real S flow shows: day prefix + index.
    expect(withChips.jumpChips).toEqual({
      "practice-breakfast": "m1",
      "practice-team-sync": "t1",
      "practice-gym": "w1",
    });

    const jumped = jumpToChipHint(withChips, "w1");
    expect(jumped.focusedId).toBe("practice-gym");
    expect(jumped.jumpChips).toBeNull();
  });

  it("places a draft when nothing is focused and undoes/redoes it", () => {
    const placed = placeDraft(clearFocus(initialPracticeState));
    expect(placed.events.some((e) => e.id === PRACTICE_PLACED_ID)).toBe(true);

    const undone = undo(placed);
    expect(undone.events.some((e) => e.id === PRACTICE_PLACED_ID)).toBe(false);
    // Focus pointed at the undone block, so it clears rather than dangling.
    expect(undone.focusedId).toBeNull();

    const redone = redo(undone);
    expect(redone.events.some((e) => e.id === PRACTICE_PLACED_ID)).toBe(true);
  });

  it("opens the title editor only for a focused block", () => {
    expect(openTitleEditor(initialPracticeState).editor).toBeNull();
    const opened = openTitleEditor(focusTeamSync());
    expect(opened.editor?.eventId).toBe("practice-team-sync");
  });

  it("toggles the simulated hardcore badge", () => {
    const on = toggleHardcore(initialPracticeState);
    expect(on.hardcoreOn).toBe(true);
    expect(toggleHardcore(on).hardcoreOn).toBe(false);
  });
});
