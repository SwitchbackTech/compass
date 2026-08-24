import {
  EDIT_SEQUENCE_FIELD_BY_DIGIT,
  EDIT_SEQUENCE_FIELDS,
  FORM_FIELD_DIGITS,
} from "@web/shortcuts/edit-sequence/edit-sequence.fields";
import { describe, expect, it } from "bun:test";

describe("edit-sequence.fields", () => {
  it("assigns a unique digit 1-8 to every field", () => {
    const digits = EDIT_SEQUENCE_FIELDS.map((entry) => entry.digit);
    expect([...digits].sort()).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
    ]);
    expect(new Set(digits).size).toBe(digits.length);
  });

  it("orders FORM_FIELD_DIGITS to match the form's DOM order", () => {
    expect(FORM_FIELD_DIGITS.map((entry) => entry.field)).toEqual([
      "title",
      "start",
      "end",
      "recurrence",
      "calendar",
      "color",
      "location",
      "description",
    ]);
  });

  it("maps every digit back to its field for dispatch", () => {
    for (const entry of EDIT_SEQUENCE_FIELDS) {
      expect(EDIT_SEQUENCE_FIELD_BY_DIGIT[entry.digit]).toBe(entry.field);
    }
  });
});
