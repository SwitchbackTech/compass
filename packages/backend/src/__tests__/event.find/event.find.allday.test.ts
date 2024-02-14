import { MongoClient } from "mongodb";
import { getReadAllFilter } from "../../event/services/event.service.util";
import { mockEventSetMar22 } from "../../../../core/src/__mocks__/events/events.22mar";

describe("Mar 6 - 12, 2022: All-Day Events", () => {
  let connection;
  let db;
  let eventCollection;
  let filter;
  let titles;

  beforeAll(async () => {
    // setup in-memory connection using jest-mongodb
    connection = await MongoClient.connect(process.env.MONGO_URL as string);
    db = await connection.db();
    eventCollection = db.collection("event");
    await eventCollection.insertMany(mockEventSetMar22);

    filter = getReadAllFilter("user1", {
      start: "2022-03-06T00:00:00-07:00",
      end: "2022-03-12T23:59:59-07:00",
    });
    const result = await eventCollection.find(filter).toArray();
    titles = result.map((e) => e.title);
  });

  afterAll(async () => {
    await connection.close();
  });

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
