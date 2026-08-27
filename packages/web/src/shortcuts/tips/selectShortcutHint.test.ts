import { selectShortcutHint } from "@web/shortcuts/tips/selectShortcutHint";
import { describe, expect, it } from "bun:test";

const calendarIdle = {
  isFormOpen: false,
  isLifeView: false,
  eventFocused: false,
  firstEventDone: false,
};

const afterFirstEvent = {
  ...calendarIdle,
  firstEventDone: true,
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
    expect(selectShortcutHint(afterFirstEvent).id).toBe("page-jump");
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

  it("skips hold-Mod on an idle calendar once the user has demonstrated it", () => {
    expect(selectShortcutHint(afterFirstEvent, ["page-jump"]).id).toBe(
      "event-jump",
    );
  });

  it("teaches week-column letters after event jump on week view", () => {
    expect(
      selectShortcutHint({ ...afterFirstEvent, isWeekView: true }, [
        "page-jump",
        "event-jump",
      ]).id,
    ).toBe("week-day-focus");
  });

  it("walks the idle pool in showcase order as primitives are demonstrated", () => {
    expect(
      selectShortcutHint(afterFirstEvent, ["page-jump", "event-jump"]).id,
    ).toBe("command-palette");
    expect(
      selectShortcutHint(afterFirstEvent, [
        "page-jump",
        "event-jump",
        "command-palette",
      ]).id,
    ).toBe("create-event");
  });

  it("rotates the idle pool after every primitive has been demonstrated", () => {
    expect(
      selectShortcutHint(afterFirstEvent, [
        "event-jump",
        "command-palette",
        "create-event",
        "page-jump",
      ]).id,
    ).toBe("event-jump");
    expect(
      selectShortcutHint(afterFirstEvent, [
        "page-jump",
        "event-jump",
        "command-palette",
        "create-event",
      ]).id,
    ).toBe("page-jump");
  });

  it("teaches nudge after the edit sequence once an event is focused", () => {
    expect(
      selectShortcutHint({ ...afterFirstEvent, eventFocused: true }, [
        "edit-sequence",
      ]).id,
    ).toBe("nudge");
  });

  it("teaches edge focus after nudge once an event is focused", () => {
    expect(
      selectShortcutHint({ ...afterFirstEvent, eventFocused: true }, [
        "edit-sequence",
        "nudge",
      ]).id,
    ).toBe("edge-focus");
  });

  it("falls through to the command palette after save-draft is demonstrated", () => {
    expect(
      selectShortcutHint({ ...afterFirstEvent, isFormOpen: true }, [
        "save-draft",
      ]).id,
    ).toBe("command-palette");
  });

  it("falls through to the command palette after Life T is demonstrated", () => {
    expect(
      selectShortcutHint({ ...calendarIdle, isLifeView: true }, [
        "life-this-week",
      ]).id,
    ).toBe("command-palette");
  });

  it("keeps the first-event save funnel sticky even after Enter is demonstrated", () => {
    expect(
      selectShortcutHint({ ...calendarIdle, isFormOpen: true }, [
        "first-event-save",
      ]).id,
    ).toBe("first-event-save");
  });
});
