import { mergeBookingBusyIntervals } from "@core/booking/compute-booking-slots";
import { mergeBusyIntervals } from "./busy-query.service";
import { describe, expect, it } from "bun:test";

const at = (iso: string) => new Date(iso);

// The booking slot engine ships its own copy of this merge (core cannot
// import sync). This pins the two implementations to identical behavior so
// slots offered to guests and busy blocks reported by sync can never disagree
// about what counts as busy.
describe("mergeBookingBusyIntervals parity with sync mergeBusyIntervals", () => {
  const fixtures: Array<{
    name: string;
    intervals: Array<{ start: Date; end: Date }>;
  }> = [
    { name: "empty input", intervals: [] },
    {
      name: "overlapping intervals",
      intervals: [
        { start: at("2026-09-07T09:00:00Z"), end: at("2026-09-07T10:30:00Z") },
        { start: at("2026-09-07T10:00:00Z"), end: at("2026-09-07T11:00:00Z") },
      ],
    },
    {
      name: "touching intervals merge",
      intervals: [
        { start: at("2026-09-07T09:00:00Z"), end: at("2026-09-07T10:00:00Z") },
        { start: at("2026-09-07T10:00:00Z"), end: at("2026-09-07T11:00:00Z") },
      ],
    },
    {
      name: "nested interval leaves the end unchanged",
      intervals: [
        { start: at("2026-09-07T09:00:00Z"), end: at("2026-09-07T12:00:00Z") },
        { start: at("2026-09-07T10:00:00Z"), end: at("2026-09-07T11:00:00Z") },
      ],
    },
    {
      name: "empty and inverted intervals drop",
      intervals: [
        { start: at("2026-09-07T09:00:00Z"), end: at("2026-09-07T09:00:00Z") },
        { start: at("2026-09-07T11:00:00Z"), end: at("2026-09-07T10:00:00Z") },
        { start: at("2026-09-07T13:00:00Z"), end: at("2026-09-07T14:00:00Z") },
      ],
    },
    {
      name: "out-of-order disjoint intervals sort",
      intervals: [
        { start: at("2026-09-07T15:00:00Z"), end: at("2026-09-07T16:00:00Z") },
        { start: at("2026-09-07T09:00:00Z"), end: at("2026-09-07T10:00:00Z") },
      ],
    },
  ];

  for (const { name, intervals } of fixtures) {
    it(name, () => {
      const clone = () =>
        intervals.map(({ start, end }) => ({
          start: new Date(start),
          end: new Date(end),
        }));
      expect(mergeBookingBusyIntervals(clone())).toEqual(
        mergeBusyIntervals(clone()),
      );
    });
  }
});
