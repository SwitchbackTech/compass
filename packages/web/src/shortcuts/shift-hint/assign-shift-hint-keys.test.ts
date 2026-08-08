import {
  assignDayJumpKeys,
  DAY_JUMP_PREFIX_BY_WEEKDAY,
  filterHintsByPrefix,
  matchDayJumpKeystroke,
} from "@web/shortcuts/shift-hint/assign-shift-hint-keys";
import { describe, expect, it } from "bun:test";

describe("assignDayJumpKeys", () => {
  it("assigns weekday prefixes and per-day indices chronologically", () => {
    const assignments = assignDayJumpKeys(
      [
        {
          eventId: "wed-2",
          startMs: 200,
          eventType: "timed",
          dayKey: "2026-08-05",
          weekday: 3,
        },
        {
          eventId: "wed-1",
          startMs: 100,
          eventType: "timed",
          dayKey: "2026-08-05",
          weekday: 3,
        },
        {
          eventId: "mon-1",
          startMs: 50,
          eventType: "timed",
          dayKey: "2026-08-03",
          weekday: 1,
        },
      ],
      "week",
    );

    expect(assignments).toEqual([
      {
        eventId: "mon-1",
        hint: "m1",
        dayKey: "2026-08-03",
        dayPrefix: "m",
        index: 1,
      },
      {
        eventId: "wed-1",
        hint: "w1",
        dayKey: "2026-08-05",
        dayPrefix: "w",
        index: 1,
      },
      {
        eventId: "wed-2",
        hint: "w2",
        dayKey: "2026-08-05",
        dayPrefix: "w",
        index: 2,
      },
    ]);
  });

  it("uses SU / SA / R / F prefixes from the weekday map", () => {
    expect(DAY_JUMP_PREFIX_BY_WEEKDAY[0]).toBe("su");
    expect(DAY_JUMP_PREFIX_BY_WEEKDAY[4]).toBe("r");
    expect(DAY_JUMP_PREFIX_BY_WEEKDAY[5]).toBe("f");
    expect(DAY_JUMP_PREFIX_BY_WEEKDAY[6]).toBe("sa");

    const assignments = assignDayJumpKeys(
      [
        {
          eventId: "sun",
          startMs: 1,
          eventType: "timed",
          dayKey: "2026-08-02",
          weekday: 0,
        },
        {
          eventId: "sat",
          startMs: 1,
          eventType: "timed",
          dayKey: "2026-08-08",
          weekday: 6,
        },
        {
          eventId: "fri-10",
          startMs: 10,
          eventType: "timed",
          dayKey: "2026-08-07",
          weekday: 5,
        },
      ],
      "week",
    );

    expect(assignments.map((item) => item.hint)).toEqual(["su1", "f1", "sa1"]);
  });

  it("prefers all-day before timed on equal start within a day", () => {
    const assignments = assignDayJumpKeys(
      [
        {
          eventId: "timed",
          startMs: 100,
          eventType: "timed",
          dayKey: "2026-08-03",
          weekday: 1,
        },
        {
          eventId: "allday",
          startMs: 100,
          eventType: "all-day",
          dayKey: "2026-08-03",
          weekday: 1,
        },
      ],
      "week",
    );
    expect(assignments.map((item) => item.hint)).toEqual(["m1", "m2"]);
    expect(assignments.map((item) => item.eventId)).toEqual([
      "allday",
      "timed",
    ]);
  });

  it("uses bare numeric hints in day mode", () => {
    const assignments = assignDayJumpKeys(
      [
        {
          eventId: "b",
          startMs: 200,
          eventType: "timed",
          dayKey: "2026-08-05",
          weekday: 3,
        },
        {
          eventId: "a",
          startMs: 100,
          eventType: "timed",
          dayKey: "2026-08-05",
          weekday: 3,
        },
      ],
      "day",
    );
    expect(assignments).toEqual([
      {
        eventId: "a",
        hint: "1",
        dayKey: "2026-08-05",
        dayPrefix: "",
        index: 1,
      },
      {
        eventId: "b",
        hint: "2",
        dayKey: "2026-08-05",
        dayPrefix: "",
        index: 2,
      },
    ]);
  });

  it("supports double-digit indices", () => {
    const targets = Array.from({ length: 10 }, (_, index) => ({
      eventId: `e${index}`,
      startMs: index,
      eventType: "timed" as const,
      dayKey: "2026-08-07",
      weekday: 5,
    }));
    const assignments = assignDayJumpKeys(targets, "week");
    expect(assignments[9]?.hint).toBe("f10");
  });
});

describe("matchDayJumpKeystroke", () => {
  const weekAssignments = assignDayJumpKeys(
    [
      {
        eventId: "sun-event",
        startMs: 1,
        eventType: "timed",
        dayKey: "2026-08-02",
        weekday: 0,
      },
      {
        eventId: "wed-1",
        startMs: 1,
        eventType: "timed",
        dayKey: "2026-08-05",
        weekday: 3,
      },
      {
        eventId: "wed-2",
        startMs: 2,
        eventType: "timed",
        dayKey: "2026-08-05",
        weekday: 3,
      },
      {
        eventId: "wed-3",
        startMs: 3,
        eventType: "timed",
        dayKey: "2026-08-05",
        weekday: 3,
      },
      {
        eventId: "wed-4",
        startMs: 4,
        eventType: "timed",
        dayKey: "2026-08-05",
        weekday: 3,
      },
      {
        eventId: "sat-event",
        startMs: 1,
        eventType: "timed",
        dayKey: "2026-08-08",
        weekday: 6,
      },
      ...Array.from({ length: 10 }, (_, index) => ({
        eventId: `fri-${index + 1}`,
        startMs: index + 1,
        eventType: "timed" as const,
        dayKey: "2026-08-07",
        weekday: 5,
      })),
    ],
    "week",
  );

  it("selects a unique day and focuses its first event", () => {
    expect(
      matchDayJumpKeystroke({
        assignments: weekAssignments,
        key: "w",
        buffer: "",
      }),
    ).toEqual({
      kind: "selectDay",
      dayPrefix: "w",
      dayKey: "2026-08-05",
      firstEventId: "wed-1",
      buffer: "w",
    });
  });

  it("narrows weekend on S then resolves SU / SA", () => {
    expect(
      matchDayJumpKeystroke({
        assignments: weekAssignments,
        key: "s",
        buffer: "",
      }),
    ).toEqual({
      kind: "prefix",
      buffer: "s",
      dayKeys: ["2026-08-02", "2026-08-08"],
    });

    expect(
      matchDayJumpKeystroke({
        assignments: weekAssignments,
        key: "u",
        buffer: "s",
      }),
    ).toEqual({
      kind: "selectDay",
      dayPrefix: "su",
      dayKey: "2026-08-02",
      firstEventId: "sun-event",
      buffer: "su",
    });

    expect(
      matchDayJumpKeystroke({
        assignments: weekAssignments,
        key: "a",
        buffer: "s",
      }),
    ).toEqual({
      kind: "selectDay",
      dayPrefix: "sa",
      dayKey: "2026-08-08",
      firstEventId: "sat-event",
      buffer: "sa",
    });
  });

  it("focuses W4 after day selection", () => {
    expect(
      matchDayJumpKeystroke({
        assignments: weekAssignments,
        key: "4",
        buffer: "w",
      }),
    ).toEqual({
      kind: "focus",
      eventId: "wed-4",
      dayKey: "2026-08-05",
      buffer: "w4",
    });
  });

  it("waits on F1 when F10 also exists, then focuses F10", () => {
    expect(
      matchDayJumpKeystroke({
        assignments: weekAssignments,
        key: "1",
        buffer: "f",
      }),
    ).toEqual({
      kind: "prefix",
      buffer: "f1",
      dayKeys: ["2026-08-07"],
    });

    expect(
      matchDayJumpKeystroke({
        assignments: weekAssignments,
        key: "0",
        buffer: "f1",
      }),
    ).toEqual({
      kind: "focus",
      eventId: "fri-10",
      dayKey: "2026-08-07",
      buffer: "f10",
    });
  });

  it("filters chips by prefix", () => {
    expect(
      filterHintsByPrefix(weekAssignments, "w").map((a) => a.hint),
    ).toEqual(["w1", "w2", "w3", "w4"]);
  });

  it("matches day-mode digits", () => {
    const dayAssignments = assignDayJumpKeys(
      [
        {
          eventId: "a",
          startMs: 1,
          eventType: "timed",
          dayKey: "2026-08-05",
          weekday: 3,
        },
        {
          eventId: "b",
          startMs: 2,
          eventType: "timed",
          dayKey: "2026-08-05",
          weekday: 3,
        },
      ],
      "day",
    );

    expect(
      matchDayJumpKeystroke({
        assignments: dayAssignments,
        key: "2",
        buffer: "",
        mode: "day",
      }),
    ).toEqual({
      kind: "focus",
      eventId: "b",
      dayKey: "2026-08-05",
      buffer: "2",
    });
  });
});
