import {
  BOOKING_FIELDS,
  BOOKING_SECTION_CHORDS,
  bookingChordForEvent,
  dispatchBookingChord,
  SETTINGS_MOD_LETTER_POOL,
} from "@web/booking/booking-sequence.fields";
import { afterEach, describe, expect, test } from "bun:test";

const EXCLUDED_LETTERS = new Set([
  "a",
  "c",
  "v",
  "x",
  "z",
  "f",
  "g",
  "h",
  "m",
  "q",
  "n",
  "t",
  "w",
  "l",
  "r",
  "p",
  "s",
  "d",
  "k",
  "e",
  ",",
]);

const chordFor = (field: (typeof BOOKING_SECTION_CHORDS)[number]["field"]) => {
  const chord = BOOKING_SECTION_CHORDS.find((entry) => entry.field === field);
  if (!chord) throw new Error(`missing chord for ${field}`);
  return chord;
};

afterEach(() => {
  document.body.replaceChildren();
});

describe("BOOKING_SECTION_CHORDS", () => {
  test("each chord has a unique key", () => {
    const keys = BOOKING_SECTION_CHORDS.map((chord) => chord.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("digit chords are only 4 through 9", () => {
    const digits = BOOKING_SECTION_CHORDS.filter((chord) =>
      /^\d$/.test(chord.key),
    ).map((chord) => Number(chord.key));
    expect(digits).toEqual([4, 5, 6, 7, 8, 9]);
  });

  test("letter chords come from SETTINGS_MOD_LETTER_POOL and skip excluded letters", () => {
    const letters = BOOKING_SECTION_CHORDS.filter((chord) =>
      /^[a-z]$/.test(chord.key),
    ).map((chord) => chord.key);
    expect(letters.length).toBeGreaterThan(0);
    const pool: readonly string[] = SETTINGS_MOD_LETTER_POOL;
    for (const letter of letters) {
      expect(pool).toContain(letter);
      expect(EXCLUDED_LETTERS.has(letter)).toBe(false);
    }
  });

  test("BOOKING_FIELDS keeps a unique id for every save-error anchor", () => {
    expect(new Set(BOOKING_FIELDS).size).toBe(BOOKING_FIELDS.length);
  });
});

describe("bookingChordForEvent", () => {
  test("Digit4 maps to enabled", () => {
    expect(bookingChordForEvent({ code: "Digit4", key: "4" })?.field).toBe(
      "enabled",
    );
  });

  test("KeyU and lowercase u map to link", () => {
    expect(bookingChordForEvent({ code: "KeyU", key: "u" })?.field).toBe(
      "link",
    );
    expect(bookingChordForEvent({ code: "KeyU", key: "U" })?.field).toBe(
      "link",
    );
  });

  test("unmapped digits and letters return null", () => {
    expect(bookingChordForEvent({ code: "Digit1", key: "1" })).toBeNull();
    expect(bookingChordForEvent({ code: "KeyA", key: "a" })).toBeNull();
  });
});

describe("dispatchBookingChord", () => {
  test("focuses the matching field", () => {
    const input = document.createElement("input");
    input.setAttribute("data-booking-field", "duration");
    document.body.append(input);

    expect(dispatchBookingChord(chordFor("duration"))).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  test("clicks the link button", () => {
    const button = document.createElement("button");
    button.setAttribute("data-booking-field", "link");
    let clicked = false;
    button.addEventListener("click", () => {
      clicked = true;
    });
    document.body.append(button);

    expect(dispatchBookingChord(chordFor("link"))).toBe(true);
    expect(document.activeElement).toBe(button);
    expect(clicked).toBe(true);
  });

  test("consumes the chord when a foreign dialog is open", () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    const inner = document.createElement("input");
    dialog.append(inner);
    const target = document.createElement("input");
    target.setAttribute("data-booking-field", "duration");
    document.body.append(dialog, target);
    inner.focus();

    expect(dispatchBookingChord(chordFor("duration"))).toBe(true);
    expect(document.activeElement).toBe(inner);
  });

  test("returns false when the field is missing", () => {
    expect(dispatchBookingChord(chordFor("duration"))).toBe(false);
  });
});
