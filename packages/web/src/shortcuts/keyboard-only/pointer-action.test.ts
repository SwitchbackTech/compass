import {
  POINTER_ACTION_ATTRIBUTE,
  POINTER_ACTIONS,
  POINTER_EVENT_ID_ATTRIBUTE,
  resolveBlockedPointerAttempt,
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
