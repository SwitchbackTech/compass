import {
  type AvailabilitySlot,
  generateAvailabilitySlots,
  normalizeAvailabilitySlots,
  selectDefaultAvailabilitySlots,
} from "./availability-slot.util";
import { describe, expect, it } from "bun:test";

const zone = "America/Denver";

describe("generateAvailabilitySlots", () => {
  it("generates aligned weekday working-hour slots and clips past starts", () => {
    const slots = generateAvailabilitySlots({
      rangeStart: "2026-08-24T06:00:00Z",
      rangeEnd: "2026-08-25T06:00:00Z",
      now: "2026-08-24T16:15:00Z",
      timeZone: zone,
    });
    expect(slots[0].start).toBe("2026-08-24T16:30:00.000Z");
    expect(slots.at(-1)?.end).toBe("2026-08-24T23:00:00.000Z");
  });

  it("excludes overlaps and all-day dates but permits touching boundaries", () => {
    const slots = generateAvailabilitySlots({
      rangeStart: "2026-08-24T06:00:00Z",
      rangeEnd: "2026-08-26T06:00:00Z",
      now: "2026-08-24T06:00:00Z",
      timeZone: zone,
      conflicts: [
        { start: "2026-08-24T16:30:00Z", end: "2026-08-24T17:00:00Z" },
        { date: "2026-08-25", allDay: true },
        {
          start: "2026-08-24T18:00:00Z",
          end: "2026-08-24T19:00:00Z",
          busy: false,
        },
      ],
    });
    expect(
      slots.some((slot) => slot.start === "2026-08-24T16:00:00.000Z"),
    ).toBe(true);
    expect(
      slots.some((slot) => slot.start === "2026-08-24T16:30:00.000Z"),
    ).toBe(false);
    expect(slots.some((slot) => slot.start.startsWith("2026-08-25"))).toBe(
      false,
    );
  });
});

describe("selection and normalization", () => {
  const slot = (start: string): AvailabilitySlot => {
    const end = new Date(Date.parse(start) + 30 * 60_000).toISOString();
    return {
      id: `${start}/${end}`,
      start,
      end,
      selected: false,
      origin: "suggested",
    };
  };

  it("spreads the three defaults across days before filling within a day", () => {
    const candidates = [
      slot("2026-08-24T16:00:00.000Z"),
      slot("2026-08-24T16:30:00.000Z"),
      slot("2026-08-24T17:00:00.000Z"),
      slot("2026-08-25T20:00:00.000Z"),
      slot("2026-08-26T15:00:00.000Z"),
    ];
    const selected = selectDefaultAvailabilitySlots(candidates, zone).filter(
      (value) => value.selected,
    );
    expect(selected.map((value) => value.start)).toEqual([
      "2026-08-24T16:00:00.000Z",
      "2026-08-25T20:00:00.000Z",
      "2026-08-26T15:00:00.000Z",
    ]);
  });

  it("still honours one-hour spacing when filling beyond one per day", () => {
    const candidates = [
      slot("2026-08-24T16:00:00.000Z"),
      slot("2026-08-24T16:30:00.000Z"),
      slot("2026-08-24T17:00:00.000Z"),
      slot("2026-08-24T17:30:00.000Z"),
    ];
    const selected = selectDefaultAvailabilitySlots(candidates, zone).filter(
      (value) => value.selected,
    );
    // 17:30 loses to 17:00, which clears the hour from the 16:00 anchor.
    expect(selected.map((value) => value.start)).toEqual([
      "2026-08-24T16:00:00.000Z",
      "2026-08-24T16:30:00.000Z",
      "2026-08-24T17:00:00.000Z",
    ]);
  });

  it("merges only exactly adjacent selected slots", () => {
    const values = [
      slot("2026-08-24T16:00:00.000Z"),
      slot("2026-08-24T16:30:00.000Z"),
      slot("2026-08-24T17:30:00.000Z"),
    ].map((value) => ({ ...value, selected: true }));
    expect(
      normalizeAvailabilitySlots(values).map(({ start, end }) => ({
        start,
        end,
      })),
    ).toEqual([
      { start: "2026-08-24T16:00:00.000Z", end: "2026-08-24T17:00:00.000Z" },
      { start: "2026-08-24T17:30:00.000Z", end: "2026-08-24T18:00:00.000Z" },
    ]);
  });
});
