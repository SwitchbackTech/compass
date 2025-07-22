import { Filter } from "mongodb";
import { mockEventSetMar22 } from "@core/__mocks__/v1/events/events.22mar";
import { Schema_Event } from "@core/types/event.types";
import {
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import { getReadAllFilter } from "@backend/event/services/event.service.util";

describe("Mar 6 - 12, 2022: All-Day Events", () => {
  let filter: Filter<Schema_Event>;
  let titles: string[];

  beforeAll(async () => {
    await setupTestDb();

    await mongoService.event.insertMany(mockEventSetMar22);

    filter = getReadAllFilter("user1", {
      start: "2022-03-06T00:00:00-07:00",
      end: "2022-03-12T23:59:59-07:00",
    });
    const result = await mongoService.event.find(filter).toArray();
    titles = result.map((e) => e.title);
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
