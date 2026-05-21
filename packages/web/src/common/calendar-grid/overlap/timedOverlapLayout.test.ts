import { computeTimedOverlapLayout } from "./timedOverlapLayout";
import { describe, expect, it } from "bun:test";

describe("computeTimedOverlapLayout", () => {
  it("puts the lower timed event in front when events overlap", () => {
    const layout = computeTimedOverlapLayout([
      {
        eventId: "early",
        startDate: "2026-05-20T18:30:00.000Z",
        endDate: "2026-05-20T19:30:00.000Z",
        title: "6:30 event",
      },
      {
        eventId: "late",
        startDate: "2026-05-20T19:00:00.000Z",
        endDate: "2026-05-20T19:45:00.000Z",
        title: "7:00 event",
      },
    ]);

    expect(layout.get("late")?.zIndex).toBeGreaterThan(
      layout.get("early")?.zIndex ?? 0,
    );
  });

  it("puts the shorter event in front when overlapping events start together", () => {
    const layout = computeTimedOverlapLayout([
      {
        eventId: "long",
        startDate: "2026-05-20T19:00:00.000Z",
        endDate: "2026-05-20T20:00:00.000Z",
        title: "Long event",
      },
      {
        eventId: "short",
        startDate: "2026-05-20T19:00:00.000Z",
        endDate: "2026-05-20T19:30:00.000Z",
        title: "Short event",
      },
    ]);

    expect(layout.get("short")?.zIndex).toBeGreaterThan(
      layout.get("long")?.zIndex ?? 0,
    );
  });

  it("uses a stable title and id tie-break for equal overlaps", () => {
    const layout = computeTimedOverlapLayout([
      {
        eventId: "b-id",
        startDate: "2026-05-20T19:00:00.000Z",
        endDate: "2026-05-20T19:30:00.000Z",
        title: "Beta",
      },
      {
        eventId: "a-id",
        startDate: "2026-05-20T19:00:00.000Z",
        endDate: "2026-05-20T19:30:00.000Z",
        title: "Alpha",
      },
    ]);

    expect(layout.get("b-id")?.zIndex).toBeGreaterThan(
      layout.get("a-id")?.zIndex ?? 0,
    );
  });

  it("leaves non-overlapping events full width", () => {
    const layout = computeTimedOverlapLayout([
      {
        eventId: "morning",
        startDate: "2026-05-20T09:00:00.000Z",
        endDate: "2026-05-20T10:00:00.000Z",
      },
      {
        eventId: "afternoon",
        startDate: "2026-05-20T14:00:00.000Z",
        endDate: "2026-05-20T15:00:00.000Z",
      },
    ]);

    expect(layout.get("morning")).toMatchObject({
      horizontalOffsetPercent: 0,
      isFrontmost: false,
      isOverlapping: false,
      widthPercent: 100,
    });
    expect(layout.get("afternoon")).toMatchObject({
      horizontalOffsetPercent: 0,
      isFrontmost: false,
      isOverlapping: false,
      widthPercent: 100,
    });
  });

  it("flags only the highest-z card in an overlap group as frontmost", () => {
    const layout = computeTimedOverlapLayout([
      {
        eventId: "back",
        startDate: "2026-05-20T18:00:00.000Z",
        endDate: "2026-05-20T19:30:00.000Z",
        title: "Back",
      },
      {
        eventId: "middle",
        startDate: "2026-05-20T18:15:00.000Z",
        endDate: "2026-05-20T19:15:00.000Z",
        title: "Middle",
      },
      {
        eventId: "front",
        startDate: "2026-05-20T18:30:00.000Z",
        endDate: "2026-05-20T19:00:00.000Z",
        title: "Front",
      },
    ]);

    expect(layout.get("back")?.isFrontmost).toBe(false);
    expect(layout.get("middle")?.isFrontmost).toBe(false);
    expect(layout.get("front")?.isFrontmost).toBe(true);
  });

  it("keeps the back card at full width and renders the front as a narrow chip in a two-event overlap", () => {
    const layout = computeTimedOverlapLayout([
      {
        eventId: "back",
        startDate: "2026-05-20T18:00:00.000Z",
        endDate: "2026-05-20T19:30:00.000Z",
        title: "Back",
      },
      {
        eventId: "front",
        startDate: "2026-05-20T18:30:00.000Z",
        endDate: "2026-05-20T19:00:00.000Z",
        title: "Front",
      },
    ]);

    expect(layout.get("back")).toMatchObject({
      horizontalOffsetPercent: 0,
      widthPercent: 100,
    });
    expect(layout.get("front")).toMatchObject({
      horizontalOffsetPercent: 58,
      widthPercent: 42,
    });
  });

  it("cascades a three-event overlap with a full-width back and readable nested overlays", () => {
    const layout = computeTimedOverlapLayout([
      {
        eventId: "one",
        startDate: "2026-05-20T18:00:00.000Z",
        endDate: "2026-05-20T19:30:00.000Z",
      },
      {
        eventId: "two",
        startDate: "2026-05-20T18:30:00.000Z",
        endDate: "2026-05-20T19:15:00.000Z",
      },
      {
        eventId: "three",
        startDate: "2026-05-20T19:00:00.000Z",
        endDate: "2026-05-20T20:00:00.000Z",
      },
    ]);

    expect([...layout.values()]).toHaveLength(3);
    expect(layout.get("one")).toMatchObject({
      horizontalOffsetPercent: 0,
      widthPercent: 100,
    });
    expect(layout.get("two")).toMatchObject({
      horizontalOffsetPercent: 32,
      widthPercent: 55,
    });
    expect(layout.get("three")).toMatchObject({
      horizontalOffsetPercent: 58,
      widthPercent: 42,
    });
    expect(
      (layout.get("two")?.horizontalOffsetPercent ?? 0) +
        (layout.get("two")?.widthPercent ?? 0),
    ).toBe(87);
    expect(
      (layout.get("three")?.horizontalOffsetPercent ?? 0) +
        (layout.get("three")?.widthPercent ?? 0),
    ).toBe(100);
    expect(
      (layout.get("three")?.horizontalOffsetPercent ?? 0) -
        (layout.get("two")?.horizontalOffsetPercent ?? 0),
    ).toBeGreaterThanOrEqual(18);
    expect(layout.get("three")?.zIndex).toBeGreaterThan(
      layout.get("one")?.zIndex ?? 0,
    );
  });

  it("steps overlays monotonically right and clamps within the column in a four-event overlap", () => {
    const layout = computeTimedOverlapLayout([
      {
        eventId: "back",
        startDate: "2026-05-20T18:00:00.000Z",
        endDate: "2026-05-20T22:00:00.000Z",
        title: "Back",
      },
      {
        eventId: "mid-low",
        startDate: "2026-05-20T18:15:00.000Z",
        endDate: "2026-05-20T20:00:00.000Z",
        title: "Mid low",
      },
      {
        eventId: "mid-high",
        startDate: "2026-05-20T18:30:00.000Z",
        endDate: "2026-05-20T19:30:00.000Z",
        title: "Mid high",
      },
      {
        eventId: "front",
        startDate: "2026-05-20T19:00:00.000Z",
        endDate: "2026-05-20T19:45:00.000Z",
        title: "Front",
      },
    ]);

    const back = layout.get("back");
    const midLow = layout.get("mid-low");
    const midHigh = layout.get("mid-high");
    const front = layout.get("front");

    expect(back).toMatchObject({
      horizontalOffsetPercent: 0,
      widthPercent: 100,
    });
    expect(midLow).toMatchObject({
      horizontalOffsetPercent: 6,
      widthPercent: 81,
    });
    expect(midHigh).toMatchObject({
      horizontalOffsetPercent: 32,
      widthPercent: 55,
    });
    expect(front).toMatchObject({
      horizontalOffsetPercent: 58,
      widthPercent: 42,
    });

    for (const entry of [back, midLow, midHigh, front]) {
      expect(entry).toBeDefined();
      if (!entry) continue;
      expect(entry.widthPercent).toBeGreaterThanOrEqual(22);
      expect(
        entry.horizontalOffsetPercent + entry.widthPercent,
      ).toBeLessThanOrEqual(100);
    }
    expect(
      (midLow?.horizontalOffsetPercent ?? 0) + (midLow?.widthPercent ?? 0),
    ).toBe(87);
    expect(
      (midHigh?.horizontalOffsetPercent ?? 0) + (midHigh?.widthPercent ?? 0),
    ).toBe(87);

    expect(front?.zIndex).toBeGreaterThan(midHigh?.zIndex ?? 0);
    expect(midHigh?.zIndex).toBeGreaterThan(midLow?.zIndex ?? 0);
    expect(midLow?.zIndex).toBeGreaterThan(back?.zIndex ?? 0);
  });

  it("keeps deep overlay stacks within the column and above the minimum width", () => {
    const layout = computeTimedOverlapLayout([
      {
        eventId: "e0",
        startDate: "2026-05-20T18:00:00.000Z",
        endDate: "2026-05-20T22:00:00.000Z",
      },
      {
        eventId: "e1",
        startDate: "2026-05-20T18:05:00.000Z",
        endDate: "2026-05-20T21:00:00.000Z",
      },
      {
        eventId: "e2",
        startDate: "2026-05-20T18:10:00.000Z",
        endDate: "2026-05-20T20:00:00.000Z",
      },
      {
        eventId: "e3",
        startDate: "2026-05-20T18:15:00.000Z",
        endDate: "2026-05-20T19:30:00.000Z",
      },
      {
        eventId: "e4",
        startDate: "2026-05-20T18:20:00.000Z",
        endDate: "2026-05-20T19:00:00.000Z",
      },
      {
        eventId: "e5",
        startDate: "2026-05-20T18:25:00.000Z",
        endDate: "2026-05-20T18:45:00.000Z",
      },
    ]);

    const entries = ["e0", "e1", "e2", "e3", "e4", "e5"].map((id) =>
      layout.get(id),
    );

    for (const entry of entries) {
      expect(entry).toBeDefined();
      if (!entry) continue;
      expect(entry.widthPercent).toBeGreaterThanOrEqual(22);
      expect(
        entry.horizontalOffsetPercent + entry.widthPercent,
      ).toBeLessThanOrEqual(100);
    }

    expect(entries[0]).toMatchObject({
      horizontalOffsetPercent: 0,
      widthPercent: 100,
    });

    const overlays = entries.slice(1);
    expect(overlays[0]?.horizontalOffsetPercent).toBeCloseTo(5);
    expect(
      (overlays[0]?.horizontalOffsetPercent ?? 0) +
        (overlays[0]?.widthPercent ?? 0),
    ).toBeCloseTo(87);
    expect(overlays.at(-1)).toMatchObject({
      horizontalOffsetPercent: 58,
      widthPercent: 42,
    });

    for (let index = 1; index < overlays.length; index += 1) {
      expect(overlays[index]?.horizontalOffsetPercent ?? 0).toBeGreaterThan(
        overlays[index - 1]?.horizontalOffsetPercent ?? 0,
      );
    }

    for (const middle of overlays.slice(0, -1)) {
      expect(
        (middle?.horizontalOffsetPercent ?? 0) + (middle?.widthPercent ?? 0),
      ).toBeCloseTo(87);
    }
  });
});
