import { MongoClient } from "mongodb";

import { mockEventSetJan22 } from "@core/__mocks__/events.jan22";

import { getReadAllFilter } from "../services/event.service.helpers";

describe("getReadAllFilter", () => {
  let connection;
  let db;
  let eventCollection;

  beforeAll(async () => {
    // setup in-memory connection using jest-mongodb
    connection = await MongoClient.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    db = await connection.db();
    eventCollection = db.collection("event");
    // insert events to collection
    await eventCollection.insertMany(mockEventSetJan22);
  });

  afterAll(async () => {
    await connection.close();
  });

  it("returns events by provided user only", async () => {
    const filter = getReadAllFilter("user1", {
      start: "1999-01-01",
      end: "2039-12-12",
    });
    const events = await eventCollection.find(filter).toArray();
    events.forEach((e) => expect(e.user).toBe("user1"));
  });
  it("uses ISO date values", () => {
    const start = "2011-10-20T00:00:00-10:00";
    const end = "2011-11-26T00:00:00-10:00";
    const filter = getReadAllFilter("123user", {
      start,
      end,
    });
    const flatFilter = flatten(filter, {});
    expect(flatFilter["$lte"]).toEqual(new Date(start).toISOString());
    expect(flatFilter["$gte"]).toEqual(new Date(end).toISOString());
  });
  it("finds events within one day: UTC", async () => {
    const filter = getReadAllFilter("user1", {
      start: "2022-01-01T00:11:00Z",
      end: "2022-01-01T00:11:00Z",
    });

    const result = await eventCollection.find(filter).toArray();
    const titles = result.map((e) => e.title);
    expect(titles.includes("Jan 1 (UTC times)")).toBe(false);
  });

  it("finds events within one day: TZ offset", async () => {
    const tzOffsetFilter = getReadAllFilter("user1", {
      start: "2022-01-01T00:00:00+03:00",
      end: "2022-01-01T23:59:59+03:00",
    });

    const offsetResult = await eventCollection.find(tzOffsetFilter).toArray();
    const offsetTitles = offsetResult.map((e) => e.title);
    expect(offsetTitles.includes("Jan 1 (times)")).toBe(true);
  });

  it("finds events within day range: TZ offset", async () => {
    const filter = getReadAllFilter("user1", {
      start: "2022-01-01T00:00:00-07:00",
      end: "2022-01-03T00:00:00-07:00",
    });

    const result = await eventCollection.find(filter).toArray();
    jan1ToJan3Assertions(result);
  });

  it("finds events within day range: UTC", async () => {
    const filter = getReadAllFilter("user1", {
      start: "2022-01-01T00:00:00Z",
      end: "2022-01-03T00:00:00Z",
    });

    const result = await eventCollection.find(filter).toArray();
    jan1ToJan3Assertions(result);
  });

  it("finds events within week range: TZ offset", async () => {
    const filter = getReadAllFilter("user1", {
      start: "2022-01-01T00:00:00+06:00",
      end: "2022-01-21T23:59:59+06:00",
    });

    const result = await eventCollection.find(filter).toArray();
    const titles = result.map((e) => e.title);
    expect(titles.includes("Jan 1 - Jan 21")).toBe(true);
    expect(titles.includes("Jan 1 - Jan 21 (times)")).toBe(true);
  });

  it("finds events within month range: TZ offset", async () => {
    const filter = getReadAllFilter("user1", {
      start: "2022-01-01T00:00:00-02:00",
      end: "2022-04-20T23:59:59-02:00",
    });

    const result = await eventCollection.find(filter).toArray();
    const titles = result.map((e) => e.title);

    expect(titles.includes("Jan 1 - Apr 20")).toBe(true);
    expect(titles.includes("Jan 1 - Apr 20 (times)")).toBe(true);
  });

  it("finds events within year range: TZ offset", async () => {
    const filter = getReadAllFilter("user1", {
      start: "2022-01-01T00:00:00-02:00",
      end: "2023-01-01T23:59:59-02:00",
    });

    const result = await eventCollection.find(filter).toArray();
    const titles = result.map((e) => e.title);

    expect(titles.includes("Jan 1 2022 - Jan 1 2023")).toBe(true);
    expect(titles.includes("Jan 1 2022 - Jan 1 2023 (times)")).toBe(true);
  });

  const jan1ToJan3Assertions = (result: []) => {
    const titles = result.map((e) => e.title);

    expect(titles.includes("Dec 31 - Jan 1")).toBe(true);
    expect(titles.includes("Dec 31 - Feb 2")).toBe(true);
    expect(titles.includes("Jan 1")).toBe(true);
    expect(titles.includes("Jan 1 - Jan 3")).toBe(true);
    expect(titles.includes("Jan 1 - Jan 3 (times)")).toBe(true);
    expect(titles.includes("Jan 2")).toBe(true);
    expect(titles.includes("Jan 3")).toBe(true);
    expect(titles.includes("Jan 3 - Feb 3")).toBe(true);

    expect(titles.includes("Jan 1 2021")).toBe(false);
    expect(titles.includes("Jan 1 2021 (times)")).toBe(false);
    expect(titles.includes("Dec 31")).toBe(false);
    expect(titles.includes("Jan 4")).toBe(false);
    expect(titles.includes("Jan 1 2023")).toBe(false);
  };
});

/* useful for deeply nested objects, like Mongo filters */
const flatten = (obj: object, out: object) => {
  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] == "object") {
      out = flatten(obj[key], out); // recursively call for nesteds
    } else {
      out[key] = obj[key]; // direct assign for values
    }
  });
  return out;
};
