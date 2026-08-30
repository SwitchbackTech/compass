import {
  POINTER_ACTION_ATTRIBUTE,
  POINTER_ACTIONS,
  POINTER_EVENT_ID_ATTRIBUTE,
  POINTER_SHORTCUT_ATTRIBUTE,
  resolveBlockedPointerAttempt,
  teachingFromBlockedPointer,
} from "@web/shortcuts/keyboard-only/pointer-action";
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

  it("teaches go-to-today from the annotated month picker control", () => {
    const target = document.createElement("button");
    target.setAttribute(POINTER_ACTION_ATTRIBUTE, POINTER_ACTIONS.goToToday);
    expect(teachingFromBlockedPointer([target, document], 0)).toEqual({
      attempt: { actionId: POINTER_ACTIONS.goToToday },
    });
  });
});
