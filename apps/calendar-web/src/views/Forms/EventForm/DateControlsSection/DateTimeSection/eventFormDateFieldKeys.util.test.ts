import dayjs from "@core/util/date/dayjs";
import { formatEventFormDateLabel } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/eventFormDateField.util";
import {
  calendarAction,
  closedFieldAction,
  movePickerCursor,
} from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/eventFormDateFieldKeys.util";
import { describe, expect, it } from "bun:test";

const committed = new Date("2026-10-17T12:00:00.000Z");

describe("closedFieldAction", () => {
  it("opens or nudges on arrow keys", () => {
    expect(
      closedFieldAction("ArrowDown", {
        shiftKey: false,
        modKey: false,
        text: "10.17.26",
        committedDate: committed,
      }),
    ).toEqual({ kind: "openCalendar" });
    expect(
      closedFieldAction("ArrowDown", {
        shiftKey: true,
        modKey: false,
        text: "10.17.26",
        committedDate: committed,
      }),
    ).toEqual({ kind: "nudgeDays", days: 7 });
    expect(
      closedFieldAction("ArrowUp", {
        shiftKey: false,
        modKey: false,
        text: "10.17.26",
        committedDate: committed,
      }),
    ).toEqual({ kind: "nudgeDays", days: -1 });
  });

  it("opens the calendar on Enter only when the text is the committed day", () => {
    expect(
      closedFieldAction("Enter", {
        shiftKey: false,
        modKey: false,
        text: formatEventFormDateLabel(committed),
        committedDate: committed,
      }),
    ).toEqual({ kind: "openCalendar" });
    expect(
      closedFieldAction("Enter", {
        shiftKey: false,
        modKey: false,
        text: "10.18.26",
        committedDate: committed,
      }),
    ).toEqual({ kind: "ignore" });
    expect(
      closedFieldAction("Enter", {
        shiftKey: false,
        modKey: true,
        text: formatEventFormDateLabel(committed),
        committedDate: committed,
      }),
    ).toEqual({ kind: "ignore" });
  });
});

describe("calendarAction", () => {
  it("moves the cursor by day and week", () => {
    expect(calendarAction("ArrowLeft")).toEqual({
      kind: "moveCursor",
      days: -1,
    });
    expect(calendarAction("ArrowDown")).toEqual({
      kind: "moveCursor",
      days: 7,
    });
    expect(calendarAction("Enter")).toEqual({ kind: "pickCursor" });
    expect(calendarAction("Escape")).toEqual({ kind: "close" });
  });
});

describe("movePickerCursor", () => {
  it("anchors on the committed date until the cursor moves", () => {
    const moved = movePickerCursor(null, committed, 7);
    expect(moved.format("YYYY-MM-DD")).toBe("2026-10-24");
    expect(
      movePickerCursor(dayjs("2026-10-24"), committed, -7).format("YYYY-MM-DD"),
    ).toBe("2026-10-17");
  });
});
