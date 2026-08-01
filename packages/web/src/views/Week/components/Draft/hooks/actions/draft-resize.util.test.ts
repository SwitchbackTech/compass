import dayjs from "@core/util/date/dayjs";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { resizeDraft } from "./draft-resize.util";
import { describe, expect, it } from "bun:test";

const timedDraft = (
  start = "2024-01-15T10:00:00.000Z",
  end = "2024-01-15T11:00:00.000Z",
): GridEventDraft =>
  ({
    kind: "create",
    values: {
      schedule: {
        kind: "timed",
        start: new Date(start),
        end: new Date(end),
        timeZone: "UTC",
      },
    },
  }) as GridEventDraft;

const allDayDraft = (): GridEventDraft =>
  ({
    kind: "create",
    values: {
      schedule: {
        kind: "allDay",
        start: new Date("2024-01-15T00:00:00.000Z"),
        end: new Date("2024-01-16T00:00:00.000Z"),
      },
    },
  }) as GridEventDraft;

describe("resizeDraft", () => {
  it("updates a timed end edge without changing the active edge", () => {
    const draft = timedDraft();
    const result = resizeDraft({
      currTime: dayjs("2024-01-15T12:00:00.000Z"),
      dateBeingChanged: "endDate",
      draft,
      origin: draft,
    });

    expect(result?.flippedTo).toBeNull();
    expect(result?.hasMoved).toBe(true);
    expect(dayjs(result?.draft.values.schedule.end).toISOString()).toBe(
      "2024-01-15T12:00:00.000Z",
    );
  });

  it("flips a start-edge resize once it crosses the end", () => {
    const draft = timedDraft();
    const result = resizeDraft({
      currTime: dayjs("2024-01-15T12:00:00.000Z"),
      dateBeingChanged: "startDate",
      draft,
      origin: draft,
    });

    expect(result?.flippedTo).toBe("endDate");
    expect(dayjs(result?.draft.values.schedule.start).toISOString()).toBe(
      "2024-01-15T11:00:00.000Z",
    );
    expect(dayjs(result?.draft.values.schedule.end).toISOString()).toBe(
      "2024-01-15T12:00:00.000Z",
    );
    expect(result?.hasMoved).toBe(true);
  });

  it("flips an end-edge resize once it crosses the start", () => {
    const draft = timedDraft();
    const result = resizeDraft({
      currTime: dayjs("2024-01-15T09:00:00.000Z"),
      dateBeingChanged: "endDate",
      draft,
      origin: draft,
    });

    expect(result?.flippedTo).toBe("startDate");
    expect(dayjs(result?.draft.values.schedule.start).toISOString()).toBe(
      "2024-01-15T09:00:00.000Z",
    );
    expect(dayjs(result?.draft.values.schedule.end).toISOString()).toBe(
      "2024-01-15T10:00:00.000Z",
    );
    expect(result?.hasMoved).toBe(true);
  });

  it("resizes all-day events by calendar day", () => {
    const draft = allDayDraft();
    const result = resizeDraft({
      currTime: dayjs("2024-01-17T00:00:00.000Z"),
      dateBeingChanged: "endDate",
      draft,
      origin: draft,
    });

    expect(result?.flippedTo).toBeNull();
    expect(dayjs(result?.draft.values.schedule.end).format("YYYY-MM-DD")).toBe(
      "2024-01-18",
    );
    expect(result?.hasMoved).toBe(true);
  });

  it("rejects a timed resize into another day", () => {
    const draft = timedDraft();

    expect(
      resizeDraft({
        currTime: dayjs("2024-01-16T12:00:00.000Z"),
        dateBeingChanged: "endDate",
        draft,
        origin: draft,
      }),
    ).toBeNull();
  });
});
