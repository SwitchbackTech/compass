import { selectShortcutHint } from "@web/shortcuts/tips/selectShortcutHint";
import { describe, expect, it } from "bun:test";

const calendarIdle = {
  isFormOpen: false,
  isLifeView: false,
  eventFocused: false,
  firstEventDone: false,
};

describe("selectShortcutHint", () => {
  it("teaches title then Enter while the first-event form is open", () => {
    expect(
      selectShortcutHint({
        ...calendarIdle,
        isFormOpen: true,
      }).id,
    ).toBe("first-event-save");
  });

  it("teaches save and Mod jump once the first event is done and the form is open", () => {
    expect(
      selectShortcutHint({
        ...calendarIdle,
        isFormOpen: true,
        firstEventDone: true,
      }).id,
    ).toBe("save-draft");
  });

  it("teaches T on Life even before the first real event", () => {
    expect(
      selectShortcutHint({
        ...calendarIdle,
        isLifeView: true,
      }).id,
    ).toBe("life-this-week");
  });

  it("prefers a focused event over the first-event create prompt", () => {
    expect(
      selectShortcutHint({
        ...calendarIdle,
        eventFocused: true,
      }).id,
    ).toBe("edit-sequence");
  });

  it("asks for C until the first real event exists", () => {
    expect(selectShortcutHint(calendarIdle).id).toBe("create-event");
  });

  it("teaches hold-Mod on an idle calendar after the first event", () => {
    expect(
      selectShortcutHint({
        ...calendarIdle,
        firstEventDone: true,
      }).id,
    ).toBe("page-jump");
  });

  it("keeps form hints ahead of Life, focus, and first-event create", () => {
    expect(
      selectShortcutHint({
        isFormOpen: true,
        isLifeView: true,
        eventFocused: true,
        firstEventDone: true,
      }).id,
    ).toBe("save-draft");
  });
});
