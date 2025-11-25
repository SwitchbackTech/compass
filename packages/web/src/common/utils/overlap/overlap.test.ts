import { Categories_Event } from "@core/types/event.types";
import { getUserId } from "@web/auth/auth.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  assembleDefaultEvent,
  gridEventDefaultPosition,
} from "../event/event.util";
import { adjustOverlappingEvents, getOverlappingStyles } from "./overlap";

jest.mock("@web/auth/auth.util", () => ({
  getUserId: jest.fn(),
}));

export const assembleTimedGridEvent = async (
  startTime: string,
  endTime: string,
  id?: string,
) => {
  const _time = (time: string) => `2025-01-27T${time}:00+03:00`;

  const _event = await assembleDefaultEvent(
    Categories_Event.TIMED,
    _time(startTime),
    _time(endTime),
  );

  const event = id ? { ..._event, _id: id } : _event;
  return event as Schema_GridEvent;
};

describe("adjustOverlappingEvents", () => {
  beforeEach(() => {
    (getUserId as jest.Mock).mockResolvedValue("mockUser");
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("Sorts events by start time", async () => {
    const eventA = await assembleTimedGridEvent("07:30", "08:00");
    const eventB = await assembleTimedGridEvent("07:15", "07:45");

    const adjustedEvents = adjustOverlappingEvents([eventA, eventB]);

    expect(adjustedEvents[0].startDate).toBe(eventB.startDate);
    expect(adjustedEvents[1].startDate).toBe(eventA.startDate);
  });

  it("Returns the same array if no events overlap", async () => {
    const eventA = await assembleTimedGridEvent("07:30", "08:00");
    const eventB = await assembleTimedGridEvent("08:00", "08:30");
    const adjustedEvents = adjustOverlappingEvents([eventA, eventB]);

    expect(adjustedEvents).toEqual([eventA, eventB]);
  });

  it("Adjusts events that overlap", async () => {
    const eventA = await assembleTimedGridEvent("07:30", "08:00");
    const eventB = await assembleTimedGridEvent("07:45", "08:15");

    const adjustedEvents = adjustOverlappingEvents([eventA, eventB]);

    expect(adjustedEvents[0].position.isOverlapping).toBe(true);
    expect(adjustedEvents[0].position.horizontalOrder).toBe(1);
    expect(adjustedEvents[1].position.isOverlapping).toBe(true);
    expect(adjustedEvents[1].position.horizontalOrder).toBe(2);
  });

  it("Does not modify events that do not overlap", async () => {
    const eventA = await assembleTimedGridEvent("07:30", "08:00");
    const eventB = await assembleTimedGridEvent("07:45", "08:15");
    const nonOverlappingEventC = await assembleTimedGridEvent("09:45", "10:15");

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

  it("Adjusts events that indirectly overlap", async () => {
    const eventA = await assembleTimedGridEvent("07:30", "08:00");
    const eventB = await assembleTimedGridEvent("07:45", "08:15");
    // `eventC` starts when `eventA` ends, does not directly overlap,
    // but should still be adjusted because it indirectly overlaps due to `eventB`
    const eventC = await assembleTimedGridEvent("08:00", "08:30");

    const adjustedEvents = adjustOverlappingEvents([eventA, eventB, eventC]);

    expect(adjustedEvents[0].position.isOverlapping).toBe(true);
    expect(adjustedEvents[0].position.horizontalOrder).toBe(1);
    expect(adjustedEvents[1].position.isOverlapping).toBe(true);
    expect(adjustedEvents[1].position.horizontalOrder).toBe(2);
    expect(adjustedEvents[2].position.isOverlapping).toBe(true);
    expect(adjustedEvents[2].position.horizontalOrder).toBe(3);
  });

  it("Adjusts events that overlap in 2 distinct groups", async () => {
    // // Group 1
    const eventA = await assembleTimedGridEvent("07:30", "08:00", "eventA");
    const eventB = await assembleTimedGridEvent("07:45", "08:15", "eventB");
    const eventC = await assembleTimedGridEvent("08:00", "08:30", "eventC");

    // Group 2
    const eventD = await assembleTimedGridEvent("10:00", "11:00", "eventD");
    const eventE = await assembleTimedGridEvent("10:30", "11:30", "eventE");

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

  it("Orders alphabetically if start and end times are the same", async () => {
    const _eventA = await assembleTimedGridEvent("07:30", "08:00");
    const eventA = { ..._eventA, title: "A" };

    const _eventB = await assembleTimedGridEvent("07:30", "08:00");
    const eventB = { ..._eventB, title: "B" };

    const adjustedEvents = adjustOverlappingEvents([eventA, eventB]);

    expect(adjustedEvents[0].title).toBe("A");
    expect(adjustedEvents[0].position.horizontalOrder).toBe(1);
    expect(adjustedEvents[1].title).toBe("B");
    expect(adjustedEvents[1].position.horizontalOrder).toBe(2);
  });
});

describe("getOverlappingStyles", () => {
  it("returns correct styles for non-overlapping event", () => {
    const event = {
      position: gridEventDefaultPosition,
    } as Schema_GridEvent;

    const gridWidth = 200;
    const textWidth = 50;

    const styles = getOverlappingStyles(event, gridWidth, textWidth);

    // Assuming themeSpacing = 8, maxContainerWidth = 200 - 8 = 192
    // maxWidthDivisor = 1, maxWidth = 192
    // spread = 192 / 1 = 192
    // index = 1 - 0 = 1
    // offset = 192 * 2 = 384
    // _textWidth = 50 + 2 = 52
    // spacing = 8 * 3 = 24
    // width = min(192, max(192, 52 + 24)) = min(192, max(192, 76)) = 192
    // left = 192 - max(192, 384) - 2 = 192 - 384 - 2 = -194
    expect(styles.width).toBe("192px");
    expect(styles.zIndex).toBe(1);
  });

  it("returns correct styles for overlapping event with order 1", () => {
    const event = {
      position: {
        isOverlapping: true,
        totalEventsInGroup: 2,
        horizontalOrder: 1,
      },
    } as Schema_GridEvent;

    const gridWidth = 200;
    const textWidth = 50;

    const styles = getOverlappingStyles(event, gridWidth, textWidth);

    // maxWidthDivisor = 2, maxWidth = (200 - 8)/2 = 96
    // spread = 192 / 2 = 96
    // index = 2 - 1 = 1
    // offset = 96 * 2 = 192
    // width = min(96, max(96, 50 + 24)) = min(96, max(96, 74)) = 96 (assuming spacing = 8*3=24)
    // left = 192 - max(96, 192) - 2 = 192 - 192 - 2 = -2
    expect(styles.width).toBe("96px");
    expect(styles.zIndex).toBe(1);
  });

  it("returns correct styles for overlapping event with order 2", () => {
    const event = {
      position: {
        isOverlapping: true,
        totalEventsInGroup: 2,
        horizontalOrder: 2,
      },
    } as Schema_GridEvent;

    const gridWidth = 200;
    const textWidth = 50;

    const styles = getOverlappingStyles(event, gridWidth, textWidth);

    // index = 2 - 2 = 0
    // offset = 96 * 1 = 96
    // width = 96
    // left = 192 - max(96, 96) - 2 = 192 - 96 - 2 = 94
    expect(styles.left).toBe("94px");
    expect(styles.width).toBe("96px");
    expect(styles.zIndex).toBe(2);
  });

  it("handles large textWidth", () => {
    const event = {
      position: {
        isOverlapping: true,
        totalEventsInGroup: 2,
        horizontalOrder: 1,
      },
    } as Schema_GridEvent;

    const gridWidth = 200;
    const textWidth = 150;

    const styles = getOverlappingStyles(event, gridWidth, textWidth);

    // width = min(96, max(96, 150 + 24)) = min(96, 174) = 96
    expect(styles.width).toBe("96px");
  });

  it("handles small gridWidth", () => {
    const event = {
      position: {
        isOverlapping: true,
        totalEventsInGroup: 2,
        horizontalOrder: 1,
      },
    } as Schema_GridEvent;

    const gridWidth = 50; // small
    const textWidth = 20;

    const styles = getOverlappingStyles(event, gridWidth, textWidth);

    // maxContainerWidth = 50 - 8 = 42
    // maxWidth = 42 / 2 = 21
    // spread = 42 / 2 = 21
    // width = min(21, max(21, 20 + 24)) = min(21, 44) = 21
    expect(styles.width).toBe("21px");
  });
});
