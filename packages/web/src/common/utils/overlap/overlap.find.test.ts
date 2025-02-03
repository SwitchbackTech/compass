import { findOverlappingEvents, findOverlaps } from "./overlap";
import { assembleTimedGridEvent } from "./overlap.adjust.test";

describe("findOverlappingEvents", () => {
  it("should return all overlapping events", async () => {
    const eventA = await assembleTimedGridEvent("07:00", "08:00", "id1"); // overlaps with B
    const eventB = await assembleTimedGridEvent("07:30", "08:00", "id2"); // overlaps with A
    const eventC = await assembleTimedGridEvent("07:45", "09:00", "id3"); // overlaps with B
    const eventD = await assembleTimedGridEvent("12:00", "12:45", "id4"); // no overlaps

    const overlappingEvents = findOverlappingEvents([
      eventA,
      eventB,
      eventC,
      eventD,
    ]);

    const numberOfOverlaps = Object.keys(overlappingEvents).length;
    expect(numberOfOverlaps).toBe(3);
    expect(overlappingEvents.hasOwnProperty("id1")).toBe(true);
    expect(overlappingEvents.hasOwnProperty("id2")).toBe(true);
    expect(overlappingEvents.hasOwnProperty("id3")).toBe(true);
    expect(overlappingEvents.hasOwnProperty("id4")).toBe(false);
  });
});
