import {
  POINTER_ACTION_ATTRIBUTE,
  POINTER_ACTIONS,
  POINTER_EVENT_ID_ATTRIBUTE,
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
