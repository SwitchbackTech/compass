import {
  providerCalendarProductName,
  providerSaveFailureMessage,
} from "@core/event/event-mutation-user-message";
import { describe, expect, it } from "bun:test";

describe("providerSaveFailureMessage", () => {
  it("names Google Calendar when the provider is google", () => {
    expect(providerSaveFailureMessage("google")).toBe(
      "Couldn't save to Google Calendar. Your change wasn't saved.",
    );
  });

  it("names Microsoft Calendar when the provider is microsoft", () => {
    expect(providerSaveFailureMessage("microsoft")).toBe(
      "Couldn't save to Microsoft Calendar. Your change wasn't saved.",
    );
  });

  it("falls back when the provider is unknown", () => {
    expect(providerSaveFailureMessage(undefined)).toBe(
      "Couldn't save that change, the calendar service had a problem. Your edit was not applied.",
    );
  });
});

describe("providerCalendarProductName", () => {
  it("matches the web sidebar product names", () => {
    expect(providerCalendarProductName("google")).toBe("Google Calendar");
    expect(providerCalendarProductName("apple")).toBe("Apple Calendar");
  });
});
