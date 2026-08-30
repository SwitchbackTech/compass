import dayjs from "@core/util/date/dayjs";
import {
  ID_GRID_COLUMNS_TIMED,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import {
  POINTER_ACTION_ATTRIBUTE,
  POINTER_ACTIONS,
  POINTER_EVENT_ID_ATTRIBUTE,
  POINTER_SHORTCUT_ATTRIBUTE,
  pointerGridIntentFromPointer,
  resolveBlockedPointerAttempt,
  teachingFromBlockedPointer,
} from "@web/shortcuts/keyboard-only/pointer-action";
import { getEffectiveTimeZone } from "@web/timezone/effective-timezone.store";
import { describe, expect, it } from "bun:test";

describe("resolveBlockedPointerAttempt", () => {
  it("uses the nearest annotated element in the composed path", () => {
    const outer = document.createElement("button");
    outer.setAttribute(POINTER_ACTION_ATTRIBUTE, POINTER_ACTIONS.sidebarClose);
    const inner = document.createElement("span");
    inner.setAttribute(POINTER_ACTION_ATTRIBUTE, POINTER_ACTIONS.eventOpen);
    inner.setAttribute(POINTER_EVENT_ID_ATTRIBUTE, "event-1");

    expect(resolveBlockedPointerAttempt([inner, outer, document])).toEqual({
      actionId: POINTER_ACTIONS.eventOpen,
      eventId: "event-1",
    });
  });

  it("falls back safely for unannotated targets", () => {
    expect(
      resolveBlockedPointerAttempt([document.createElement("div"), document]),
    ).toEqual({ actionId: "unknown" });
  });

  it("attaches the nearest shortcut key from the composed path", () => {
    const outer = document.createElement("div");
    outer.setAttribute(POINTER_SHORTCUT_ATTRIBUTE, "U");
    const inner = document.createElement("button");
    inner.setAttribute(POINTER_SHORTCUT_ATTRIBUTE, "1");

    expect(resolveBlockedPointerAttempt([inner, outer, document])).toEqual({
      actionId: "unknown",
      shortcutKey: "1",
    });
  });

  it("keeps an action and a shortcut from different ancestors", () => {
    const outer = document.createElement("div");
    outer.setAttribute(POINTER_ACTION_ATTRIBUTE, POINTER_ACTIONS.sidebarOpen);
    const inner = document.createElement("span");
    inner.setAttribute(POINTER_SHORTCUT_ATTRIBUTE, "S");

    expect(resolveBlockedPointerAttempt([inner, outer, document])).toEqual({
      actionId: POINTER_ACTIONS.sidebarOpen,
      shortcutKey: "S",
    });
  });
});

describe("teachingFromBlockedPointer", () => {
  const eventTarget = () => {
    const target = document.createElement("div");
    target.setAttribute(POINTER_ACTION_ATTRIBUTE, POINTER_ACTIONS.eventOpen);
    target.setAttribute(POINTER_EVENT_ID_ATTRIBUTE, "event-1");
    return target;
  };

  it("activates event jump for a primary click on an event", () => {
    const target = eventTarget();
    expect(teachingFromBlockedPointer([target, document], 0)).toEqual({
      attempt: { actionId: POINTER_ACTIONS.eventOpen, eventId: "event-1" },
      jumpEventId: "event-1",
    });
  });

  it("does not start event jump for a right-click on an event", () => {
    const target = eventTarget();
    expect(teachingFromBlockedPointer([target, document], 2)).toEqual({
      attempt: { actionId: "unknown" },
    });
  });

  it("still teaches sidebar actions on a non-primary click", () => {
    const target = document.createElement("button");
    target.setAttribute(POINTER_ACTION_ATTRIBUTE, POINTER_ACTIONS.sidebarClose);
    expect(teachingFromBlockedPointer([target, document], 2)).toEqual({
      attempt: { actionId: POINTER_ACTIONS.sidebarClose },
    });
  });
});

describe("pointerGridIntentFromPointer", () => {
  it("keeps the exact effective-zone quarter-hour selected by a timed click", () => {
    const grid = document.createElement("div");
    grid.id = ID_GRID_MAIN;
    Object.defineProperty(grid, "scrollHeight", { value: 1440 });
    grid.getBoundingClientRect = () =>
      ({ top: 0, left: 0, right: 200, bottom: 400 }) as DOMRect;
    const columns = document.createElement("div");
    columns.id = ID_GRID_COLUMNS_TIMED;
    const column = document.createElement("div");
    column.dataset.gridDate = "2026-08-29";
    column.getBoundingClientRect = () =>
      ({ top: 0, left: 0, right: 200, bottom: 1440 }) as DOMRect;
    columns.appendChild(column);
    document.body.append(grid, columns);

    const intent = pointerGridIntentFromPointer(
      [column, columns, document],
      100,
      690,
    );

    expect(intent).toMatchObject({
      date: "2026-08-29",
      kind: "timed",
      timeKey: "1130",
    });
    expect(
      dayjs(intent?.start).tz(getEffectiveTimeZone()).format("HH:mm"),
    ).toBe("11:30");
    grid.remove();
    columns.remove();
  });
});
