import { ObjectId } from "mongodb";
import { mockEventSetJan22 } from "@core/__mocks__/v1/events/events.22jan";
import { mockEventSetSomeday1 } from "@core/__mocks__/v1/events/events.someday.1";
import { isBase } from "@core/util/event/event.util";
import {
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import { getReadCandidateFilter } from "@backend/event/read/backend-event-read.filter";
import eventService from "@backend/event/services/event.service";

describe("event read candidates", () => {
  const userId = "user1";

  beforeAll(async () => {
    await setupTestDb();
    await mongoService.event.insertMany([
      ...mockEventSetJan22,
      ...mockEventSetSomeday1,
    ]);
  });

  afterAll(cleanupTestDb);

  it("fetches calendar candidates broadly enough for read shaping", async () => {
    const filter = getReadCandidateFilter(userId, {
      start: "2022-01-01T00:00:00Z",
      end: "2022-01-03T00:00:00Z",
    });

    const result = await mongoService.event.find(filter).toArray();
    const titles = result.map((event) => event.title);

    expect(titles).toEqual(
      expect.arrayContaining([
        "Dec 31 - Jan 1",
        "Dec 31 - Feb 2",
        "Jan 1",
        "Jan 1 - Jan 3",
        "Jan 2",
        "Jan 3",
        "Jan 3 - Feb 3",
      ]),
    );
    expect(result.every((event) => event.user === userId)).toBe(true);
    expect(result.every((event) => event.isSomeday !== true)).toBe(true);
    expect(result.some(isBase)).toBe(false);
  });

  it("fetches someday candidates broadly enough across date boundaries", async () => {
    const filter = getReadCandidateFilter(userId, {
      someday: "true",
      start: "2023-05-28",
      end: "2023-06-03",
    });

    const result = await mongoService.event.find(filter).toArray();
    const titles = result.map((event) => event.title);

    expect(titles).toEqual(
      expect.arrayContaining(["Multi-Month 1", "Multi-Month 2"]),
    );
    expect(result.every((event) => event.user === userId)).toBe(true);
    expect(result.every((event) => event.isSomeday === true)).toBe(true);
    expect(result.some(isBase)).toBe(false);
  });
});

describe("eventService.readAll", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(cleanupTestDb);

  it("returns shaped calendar events and attaches base recurrence to instances", async () => {
    const user = "calendar-read-user";
    const baseId = new ObjectId();

    await mongoService.event.insertMany([
      {
        _id: baseId,
        user,
        title: "Weekly Base",
        isAllDay: false,
        isSomeday: false,
        startDate: "2026-04-06T15:00:00.000Z",
        endDate: "2026-04-06T16:00:00.000Z",
        recurrence: { rule: ["RRULE:FREQ=WEEKLY;COUNT=2"] },
      },
      {
        user,
        title: "Standalone",
        isAllDay: false,
        isSomeday: false,
        startDate: "2026-04-06T15:00:00.000Z",
        endDate: "2026-04-06T16:00:00.000Z",
      },
      {
        user,
        title: "Weekly Instance",
        isAllDay: false,
        isSomeday: false,
        startDate: "2026-04-07T15:00:00.000Z",
        endDate: "2026-04-07T16:00:00.000Z",
        recurrence: { eventId: baseId.toString() },
      },
      {
        user,
        title: "Someday Task",
        isAllDay: false,
        isSomeday: true,
        startDate: "2026-04-07T15:00:00.000Z",
        endDate: "2026-04-07T16:00:00.000Z",
      },
    ]);

    const result = await eventService.readAll(user, {
      start: "2026-04-01T00:00:00.000Z",
      end: "2026-04-30T23:59:59.999Z",
    });

    expect(Array.isArray(result)).toBe(true);
    if (!Array.isArray(result)) return;

    const titles = result.map((event) => event.title);
    expect(titles).toEqual(
      expect.arrayContaining(["Standalone", "Weekly Instance"]),
    );
    expect(titles).not.toContain("Weekly Base");
    expect(titles).not.toContain("Someday Task");

    const instance = result.find((event) => event.title === "Weekly Instance");
    expect(instance?.recurrence).toEqual({
      eventId: baseId.toString(),
      rule: ["RRULE:FREQ=WEEKLY;COUNT=2"],
    });
  });

  it("repairs missing order values when returning someday events", async () => {
    const user = "someday-order-user";
    await mongoService.event.insertMany([
      {
        user,
        title: "Missing Order 1",
        isSomeday: true,
        startDate: "2026-04-06T15:00:00.000Z",
        endDate: "2026-04-06T16:00:00.000Z",
      },
      {
        user,
        title: "Existing Order",
        isSomeday: true,
        startDate: "2026-04-07T15:00:00.000Z",
        endDate: "2026-04-07T16:00:00.000Z",
        order: 4,
      },
      {
        user,
        title: "Missing Order 2",
        isSomeday: true,
        startDate: "2026-04-08T15:00:00.000Z",
        endDate: "2026-04-08T16:00:00.000Z",
      },
    ]);

    const result = await eventService.readAll(user, {
      someday: "true",
      start: "2026-04-01T00:00:00.000Z",
      end: "2026-04-30T23:59:59.999Z",
    });

    expect(Array.isArray(result)).toBe(true);
    if (!Array.isArray(result)) return;

    expect(
      result.map((event) => ({
        title: event.title,
        order: event.order,
      })),
    ).toEqual([
      { title: "Missing Order 1", order: 5 },
      { title: "Existing Order", order: 4 },
      { title: "Missing Order 2", order: 6 },
    ]);
  });
});
