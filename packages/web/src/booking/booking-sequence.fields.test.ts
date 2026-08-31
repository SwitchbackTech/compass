import {
  BOOKING_FIELD_BY_KEY,
  BOOKING_SEQUENCE_FIELDS,
  bookingFieldAttrs,
  bookingFieldKey,
  focusBookingField,
} from "@web/booking/booking-sequence.fields";
import { afterEach, describe, expect, it } from "bun:test";

afterEach(() => {
  document.body.replaceChildren();
});

describe("BOOKING_SEQUENCE_FIELDS", () => {
  it("assigns every field a unique key", () => {
    const keys = BOOKING_SEQUENCE_FIELDS.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("leaves Settings' own booking-page keys alone", () => {
    // Settings owns bare `s` for Save on this page. Digits are nav.
    const keys = BOOKING_SEQUENCE_FIELDS.map((entry) => entry.key);
    expect(keys).not.toContain("s");
    for (const key of keys) expect(key).not.toMatch(/^\d$/);
  });

  it("maps every key back to its field", () => {
    for (const { key, field } of BOOKING_SEQUENCE_FIELDS) {
      expect(BOOKING_FIELD_BY_KEY[key]).toBe(field);
      expect(bookingFieldKey(field)).toBe(key);
    }
  });
});

describe("focusBookingField", () => {
  it("focuses the control inside a tagged wrapper", () => {
    const wrapper = document.createElement("div");
    wrapper.setAttribute(
      Object.keys(bookingFieldAttrs("hours"))[0] as string,
      "hours",
    );
    const input = document.createElement("input");
    wrapper.append(input);
    document.body.append(wrapper);

    expect(focusBookingField("hours")).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it("focuses a tagged control directly", () => {
    const select = document.createElement("select");
    select.setAttribute("data-booking-field", "duration");
    document.body.append(select);

    expect(focusBookingField("duration")).toBe(true);
    expect(document.activeElement).toBe(select);
  });

  it("focuses rather than clicks, so a checkbox is not toggled", () => {
    // The Settings idiom clicks its targets; that would flip these on the way
    // past, which is why this has its own focus-only helper.
    const label = document.createElement("label");
    label.setAttribute("data-booking-field", "enabled");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    label.append(checkbox);
    document.body.append(label);

    expect(focusBookingField("enabled")).toBe(true);
    expect(document.activeElement).toBe(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it("reports false when the field is not rendered", () => {
    expect(focusBookingField("link")).toBe(false);
  });
});
