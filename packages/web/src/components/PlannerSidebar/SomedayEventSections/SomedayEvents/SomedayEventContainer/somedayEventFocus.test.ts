import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";
import {
  consumeSomedayEventFocus,
  requestSomedayEventFocus,
} from "./somedayEventFocus";
import { afterEach, describe, expect, it } from "bun:test";

const EVENT_ID = "507f1f77bcf86cd799439011";

const addFocusableEvent = (eventId: string) => {
  const element = document.createElement("div");
  element.setAttribute(DATA_EVENT_ELEMENT_ID, eventId);
  element.tabIndex = 0;
  document.body.appendChild(element);
  return element;
};

afterEach(() => {
  document.body.innerHTML = "";
  // Drain any pending focus request so tests stay isolated.
  consumeSomedayEventFocus(EVENT_ID);
  consumeSomedayEventFocus("other");
});

describe("somedayEventFocus", () => {
  it("focuses the requested event once it is present in the DOM", () => {
    const element = addFocusableEvent(EVENT_ID);

    requestSomedayEventFocus(EVENT_ID);
    const claimed = consumeSomedayEventFocus(EVENT_ID);

    expect(claimed).toBe(true);
    expect(document.activeElement).toBe(element);
  });

  it("only lets the matching event claim the pending focus", () => {
    addFocusableEvent(EVENT_ID);

    requestSomedayEventFocus(EVENT_ID);

    expect(consumeSomedayEventFocus("other")).toBe(false);
    expect(consumeSomedayEventFocus(EVENT_ID)).toBe(true);
  });

  it("only claims the pending focus a single time", () => {
    addFocusableEvent(EVENT_ID);

    requestSomedayEventFocus(EVENT_ID);

    expect(consumeSomedayEventFocus(EVENT_ID)).toBe(true);
    expect(consumeSomedayEventFocus(EVENT_ID)).toBe(false);
  });
});
