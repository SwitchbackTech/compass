import { Categories_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { useDraftStore } from "@web/events/stores/draft.store";
import { afterAll, describe, expect, it, mock, setSystemTime } from "bun:test";

mock.module("@web/auth/compass/session/session.util", () => ({
  getUserId: mock().mockResolvedValue("mock-user-id"),
}));

const { assembleDefaultEvent } =
  require("../event/event.util") as typeof import("../event/event.util");
const { createAlldayDraft, createTimedDraft } =
  require("./draft.util") as typeof import("./draft.util");

const expectSameTime = (actual: string, expected: string) => {
  expect(dayjs(actual).isSame(dayjs(expected))).toBe(true);
};

describe("assembleDefaultEvent", () => {
  it("uses a provided end date for all-day drafts", async () => {
    const event = await assembleDefaultEvent(
      Categories_Event.ALLDAY,
      "2024-01-01",
      "2024-01-02",
    );

    expect(event).toHaveProperty("startDate", "2024-01-01");
    expect(event).toHaveProperty("endDate", "2024-01-02");
  });

  it("should include dates for someday event when provided", async () => {
    const startDate = "2024-01-01";
    const endDate = "2024-01-07";
    const eventWithDates = await assembleDefaultEvent(
      Categories_Event.SOMEDAY_WEEK,
      startDate,
      endDate,
    );

    expect(eventWithDates).toHaveProperty("startDate", startDate);
    expect(eventWithDates).toHaveProperty("endDate", endDate);
  });
  it("dates should be empty for someday event when not provided", async () => {
    const eventWithoutDates = await assembleDefaultEvent(
      Categories_Event.SOMEDAY_WEEK,
    );

    expect(eventWithoutDates).toHaveProperty("startDate", undefined);
    expect(eventWithoutDates).toHaveProperty("endDate", undefined);
  });
});

describe("shortcut draft creation", () => {
  it("creates a one-day all-day draft on today when today is inside the visible week", async () => {
    setSystemTime(new Date("2026-05-20T10:07:00.000Z"));

    await createAlldayDraft(
      dayjs("2026-05-18T00:00:00.000Z"),
      dayjs("2026-05-24T23:59:59.999Z"),
      "createShortcut",
    );

    const { event, status } = useDraftStore.getState();

    expect(status?.eventType).toBe(Categories_Event.ALLDAY);
    expectSameTime(event?.startDate as string, "2026-05-20T00:00:00.000Z");
    expectSameTime(event?.endDate as string, "2026-05-21T00:00:00.000Z");
  });

  it("creates a one-day all-day draft on the visible week anchor when today is outside the visible week", async () => {
    setSystemTime(new Date("2026-05-20T10:07:00.000Z"));

    await createAlldayDraft(
      dayjs("2026-06-01T00:00:00.000Z"),
      dayjs("2026-06-07T23:59:59.999Z"),
      "createShortcut",
    );

    const { event, status } = useDraftStore.getState();

    expect(status?.eventType).toBe(Categories_Event.ALLDAY);
    expectSameTime(event?.startDate as string, "2026-06-01T00:00:00.000Z");
    expectSameTime(event?.endDate as string, "2026-06-02T00:00:00.000Z");
  });

  it("creates timed drafts on the visible week anchor when today is outside the visible week", async () => {
    setSystemTime(new Date("2026-05-20T10:07:00.000Z"));

    await createTimedDraft(
      false,
      dayjs("2026-06-01T00:00:00.000Z"),
      "createShortcut",
    );

    const { event, status } = useDraftStore.getState();

    expect(status?.eventType).toBe(Categories_Event.TIMED);
    expectSameTime(event?.startDate as string, "2026-06-01T10:15:00.000Z");
    expectSameTime(event?.endDate as string, "2026-06-01T11:15:00.000Z");
  });
});

afterAll(() => {
  setSystemTime();
});
