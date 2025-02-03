import {
  adjustOverlappingEvents,
  assembleGridEvent,
  isEventInRange,
} from "./event.util";

describe("isEventInRange", () => {
  it("returns true if event is in range", () => {
    const event = { start: "2022-03-15", end: "2022-03-15" };
    const dates = {
      start: "2022-03-14",
      end: "2022-03-19",
    };
    expect(isEventInRange(event, dates)).toBe(true);
  });
  it("returns false if event is not in range", () => {
    const event = { start: "2022-03-15", end: "2022-03-15" };
    const dates = {
      start: "2022-03-16",
      end: "2022-03-19",
    };
    expect(isEventInRange(event, dates)).toBe(false);
  });
});

describe("adjustOverlappingEvents", () => {
  // Helper function that constructs a date string from hour:minute input.
  // Makes date time strings easier to read
  const time = (time: string) => `2025-01-27T${time}:00+03:00`;

  it("Sorts events by start time", () => {
    const eventA = assembleGridEvent({
      _id: "A",
      startDate: time("07:30"),
      endDate: time("08:00"),
    });
    const eventB = assembleGridEvent({
      _id: "B",
      startDate: time("07:15"),
      endDate: time("07:45"),
    });

    const adjustedEvents = adjustOverlappingEvents([eventA, eventB]);

    expect(adjustedEvents[0].startDate).toBe(eventB.startDate);
    expect(adjustedEvents[1].startDate).toBe(eventA.startDate);
  });

  it("Returns the same array if no events overlap", () => {
    const eventA = assembleGridEvent({
      _id: "A",
      startDate: time("07:30"),
      endDate: time("08:00"),
    });
    const eventB = assembleGridEvent({
      _id: "B",
      startDate: time("08:00"),
      endDate: time("08:30"),
    });

    const adjustedEvents = adjustOverlappingEvents([eventA, eventB]);

    expect(adjustedEvents).toEqual([eventA, eventB]);
  });

  it("Adjusts events that overlap", () => {
    const eventA = assembleGridEvent({
      _id: "A",
      startDate: time("07:30"),
      endDate: time("08:00"),
    });
    const eventB = assembleGridEvent({
      _id: "B",
      startDate: time("07:45"),
      endDate: time("08:15"),
    });

    const adjustedEvents = adjustOverlappingEvents([eventA, eventB]);

    expect(adjustedEvents[0].position.isOverlapping).toBe(true);
    expect(adjustedEvents[0].position.horizontalOrder).toBe(1);
    expect(adjustedEvents[1].position.isOverlapping).toBe(true);
    expect(adjustedEvents[1].position.horizontalOrder).toBe(2);
  });

  it("Does not modify events that do not overlap", () => {
    const eventA = assembleGridEvent({
      _id: "A",
      startDate: time("07:30"),
      endDate: time("08:00"),
    });
    const eventB = assembleGridEvent({
      _id: "B",
      startDate: time("07:45"),
      endDate: time("08:15"),
    });
    const nonOverlappingEventC = assembleGridEvent({
      _id: "C",
      startDate: time("09:45"),
      endDate: time("10:15"),
    });

    const adjustedEvents = adjustOverlappingEvents([
      eventA,
      eventB,
      nonOverlappingEventC,
    ]);

    expect(adjustedEvents[0].position.isOverlapping).toBe(true);
    expect(adjustedEvents[0].position.horizontalOrder).toBe(1);
    expect(adjustedEvents[1].position.isOverlapping).toBe(true);
    expect(adjustedEvents[1].position.horizontalOrder).toBe(2);
    // Non-overlapping event should not be modified
    expect(adjustedEvents[2]).toStrictEqual(nonOverlappingEventC);
  });

  it("Adjusts events that indirectly overlap", () => {
    const eventA = assembleGridEvent({
      _id: "A",
      startDate: time("07:30"),
      endDate: time("08:00"),
    });
    const eventB = assembleGridEvent({
      _id: "B",
      startDate: time("07:45"),
      endDate: time("08:15"),
    });
    const eventC = assembleGridEvent({
      _id: "C",
      // `eventC` starts when `eventA` ends, does not directly overlap, but should still be adjusted because it indirectly overlaps due to `eventB`
      startDate: time("08:00"),
      endDate: time("08:30"),
    });

    const adjustedEvents = adjustOverlappingEvents([eventA, eventB, eventC]);

    expect(adjustedEvents[0].position.isOverlapping).toBe(true);
    expect(adjustedEvents[0].position.horizontalOrder).toBe(1);
    expect(adjustedEvents[1].position.isOverlapping).toBe(true);
    expect(adjustedEvents[1].position.horizontalOrder).toBe(2);
    expect(adjustedEvents[2].position.isOverlapping).toBe(true);
    expect(adjustedEvents[2].position.horizontalOrder).toBe(3);
  });

  it("Adjusts events that overlap in 2 distinct groups", () => {
    // Group 1
    const eventA = assembleGridEvent({
      _id: "A",
      startDate: time("07:30"),
      endDate: time("08:00"),
    });
    const eventB = assembleGridEvent({
      _id: "B",
      startDate: time("07:45"),
      endDate: time("08:15"),
    });
    const eventC = assembleGridEvent({
      _id: "C",
      startDate: time("08:00"),
      endDate: time("08:30"),
    });

    // Group 2
    const eventD = assembleGridEvent({
      _id: "D",
      startDate: time("10:00"),
      endDate: time("11:00"),
    });
    const eventE = assembleGridEvent({
      _id: "E",
      startDate: time("10:30"),
      endDate: time("11:30"),
    });

    const adjustedEvents = adjustOverlappingEvents([
      eventA,
      eventB,
      eventC,
      eventD,
      eventE,
    ]);

    // Group 1
    expect(adjustedEvents[0].position.isOverlapping).toBe(true);
    expect(adjustedEvents[0].position.horizontalOrder).toBe(1);
    expect(adjustedEvents[1].position.isOverlapping).toBe(true);
    expect(adjustedEvents[1].position.horizontalOrder).toBe(2);
    expect(adjustedEvents[2].position.isOverlapping).toBe(true);
    expect(adjustedEvents[2].position.horizontalOrder).toBe(3);

    // Group 2
    expect(adjustedEvents[3].position.isOverlapping).toBe(true);
    expect(adjustedEvents[3].position.horizontalOrder).toBe(1);
    expect(adjustedEvents[4].position.isOverlapping).toBe(true);
    expect(adjustedEvents[4].position.horizontalOrder).toBe(2);
  });

  it("Orders alphabetically if start and end times are the same", () => {
    const eventA = assembleGridEvent({
      _id: "A",
      title: "A",
      startDate: time("07:30"),
      endDate: time("08:00"),
    });
    const eventB = assembleGridEvent({
      _id: "B",
      title: "B",
      startDate: time("07:30"),
      endDate: time("08:00"),
    });

    const adjustedEvents = adjustOverlappingEvents([eventA, eventB]);

    expect(adjustedEvents[0].title).toBe("A");
    expect(adjustedEvents[0].position.horizontalOrder).toBe(1);
    expect(adjustedEvents[1].title).toBe("B");
    expect(adjustedEvents[1].position.horizontalOrder).toBe(2);
  });
});
