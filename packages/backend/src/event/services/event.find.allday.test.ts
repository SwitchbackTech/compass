import { type Filter } from "mongodb";
import { mockEventSetMar22 } from "@core/__mocks__/v1/events/events.22mar";
import { type Schema_Event } from "@core/types/event.types";
import {
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import { getReadCandidateFilter } from "@backend/event/read/backend-event-read.filter";
import eventService from "@backend/event/services/event.service";

describe("Mar 6 - 12, 2022: All-Day Events", () => {
  let filter: Filter<Omit<Schema_Event, "_id">>;
  let titles: string[];

  beforeAll(async () => {
    await setupTestDb();

    await mongoService.event.insertMany(mockEventSetMar22);

    filter = getReadCandidateFilter("user1", {
      start: "2022-03-06T00:00:00-07:00",
      end: "2022-03-12T23:59:59-07:00",
    });
    const result = await mongoService.event.find(filter).toArray();
    titles = result.map((e) => e.title!);
  });

  afterAll(cleanupTestDb);

  it("finds overlapping multi-week event", async () => {
    expect(titles.includes("Feb 14 - Mar 8")).toBe(true);
  });
  it("finds events within target query", () => {
    expect(titles.includes("Mar 8")).toBe(true);
    expect(titles.includes("Mar 10 - 12")).toBe(true);
  });

  it("ignores events from prev week", () => {
    expect(titles.includes("Mar 5")).toBe(false);
    expect(titles.includes("Feb 28 - Mar 5")).toBe(false);
  });
  it("ignores events next week", () => {
    expect(titles.includes("Mar 13")).toBe(false);
    expect(titles.includes("Mar 13 - 16")).toBe(false);
  });
});

describe("All-Day Event read shape", () => {
  beforeAll(async () => {
    await setupTestDb();
    await mongoService.event.insertOne({
      user: "user-start-day",
      title: "Start of Week",
      isAllDay: true,
      isSomeday: false,
      startDate: "2026-04-06",
      endDate: "2026-04-07",
    });
  });

  afterAll(cleanupTestDb);

  it("returns an all-day event that starts on the requested window start", async () => {
    const result = await eventService.readAll("user-start-day", {
      start: "2026-04-06T00:00:00.000Z",
      end: "2026-04-13T00:00:00.000Z",
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.map((event) => event.title)).toContain("Start of Week");
  });
});
