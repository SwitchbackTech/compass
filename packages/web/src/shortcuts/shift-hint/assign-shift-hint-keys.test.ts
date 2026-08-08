import {
  assignShiftHintKeys,
  filterHintsByPrefix,
  generateHintKeys,
  matchShiftHintKeystroke,
  SHIFT_HINT_ALPHABET,
} from "@web/shortcuts/shift-hint/assign-shift-hint-keys";
import { describe, expect, it } from "bun:test";

describe("assignShiftHintKeys", () => {
  it("assigns home-row singles in chronological order", () => {
    const assignments = assignShiftHintKeys([
      { eventId: "c", startMs: 300, eventType: "timed" },
      { eventId: "a", startMs: 100, eventType: "timed" },
      { eventId: "b", startMs: 200, eventType: "timed" },
    ]);

    expect(assignments).toEqual([
      { eventId: "a", hint: "a" },
      { eventId: "b", hint: "s" },
      { eventId: "c", hint: "d" },
    ]);
  });

  it("excludes j and k from the alphabet", () => {
    expect(SHIFT_HINT_ALPHABET).not.toContain("j");
    expect(SHIFT_HINT_ALPHABET).not.toContain("k");
    expect(generateHintKeys(SHIFT_HINT_ALPHABET.length)).toEqual([
      ...SHIFT_HINT_ALPHABET,
    ]);
  });

  it("switches to two-letter-only keys once singles cannot cover the set", () => {
    const count = SHIFT_HINT_ALPHABET.length + 3;
    const keys = generateHintKeys(count);
    expect(keys.every((key) => key.length === 2)).toBe(true);
    expect(keys.slice(0, 3)).toEqual(["aa", "as", "ad"]);
  });

  it("caps assignments when the alphabet cannot cover every target", () => {
    const overflow =
      SHIFT_HINT_ALPHABET.length * SHIFT_HINT_ALPHABET.length + 5;
    const targets = Array.from({ length: overflow }, (_, index) => ({
      eventId: `e${index}`,
      startMs: index,
      eventType: "timed" as const,
    }));
    const assignments = assignShiftHintKeys(targets);
    expect(assignments).toHaveLength(
      SHIFT_HINT_ALPHABET.length * SHIFT_HINT_ALPHABET.length,
    );
    expect(assignments.every((item) => item.hint.length > 0)).toBe(true);
  });

  it("prefers all-day before timed on equal start", () => {
    const assignments = assignShiftHintKeys([
      { eventId: "timed", startMs: 100, eventType: "timed" },
      { eventId: "allday", startMs: 100, eventType: "all-day" },
    ]);
    expect(assignments.map((item) => item.eventId)).toEqual([
      "allday",
      "timed",
    ]);
  });

  it("is stable for the same visible set", () => {
    const targets = [
      { eventId: "2", startMs: 2, eventType: "timed" as const },
      { eventId: "1", startMs: 1, eventType: "timed" as const },
    ];
    expect(assignShiftHintKeys(targets)).toEqual(assignShiftHintKeys(targets));
  });
});

describe("matchShiftHintKeystroke", () => {
  const assignments = [
    { eventId: "1", hint: "a" },
    { eventId: "2", hint: "s" },
    { eventId: "3", hint: "aa" },
  ];

  it("focuses an exact single-key match", () => {
    expect(
      matchShiftHintKeystroke({ assignments, key: "s", prefix: "" }),
    ).toEqual({ kind: "focus", eventId: "2" });
  });

  it("narrows on the first letter of a two-letter combo", () => {
    const many = [
      { eventId: "1", hint: "aa" },
      { eventId: "2", hint: "as" },
      { eventId: "3", hint: "s" },
    ];
    expect(
      matchShiftHintKeystroke({ assignments: many, key: "a", prefix: "" }),
    ).toEqual({ kind: "prefix", prefix: "a" });
    expect(filterHintsByPrefix(many, "a")).toEqual([
      { eventId: "1", hint: "aa" },
      { eventId: "2", hint: "as" },
    ]);
  });

  it("ignores j and k", () => {
    expect(
      matchShiftHintKeystroke({ assignments, key: "j", prefix: "" }),
    ).toBeNull();
    expect(
      matchShiftHintKeystroke({ assignments, key: "k", prefix: "" }),
    ).toBeNull();
  });
});
