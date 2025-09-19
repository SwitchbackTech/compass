import { Filter, WithId } from "mongodb";
import { mockEventSetJan22 } from "@core/__mocks__/v1/events/events.22jan";
import { mockEventSetSomeday1 } from "@core/__mocks__/v1/events/events.someday.1";
import { MapEvent, gEventToCompassEvent } from "@core/mappers/map.event";
import { Schema_Event } from "@core/types/event.types";
import { isBase, isExistingInstance } from "@core/util/event/event.util";
import {
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import {
  mockRecurringGcalBaseEvent,
  mockRecurringGcalInstances,
} from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import mongoService from "@backend/common/services/mongo.service";
import { getReadAllFilter } from "@backend/event/services/event.service.util";

describe("Jan 2022: Many Formats", () => {
  const gBase = mockRecurringGcalBaseEvent({}, false, { count: 10 });
  const gInstances = mockRecurringGcalInstances(gBase);
  const userId = "user1";
  const base = gEventToCompassEvent(gBase, userId);
  const instances = MapEvent.toCompass(userId, gInstances);

  const allEvents: Array<Omit<Schema_Event, "_id">> = [
    ...mockEventSetJan22,
    ...mockEventSetSomeday1,
    ...instances,
  ];

  beforeAll(async () => {
    await setupTestDb();

    const { insertedId } = await mongoService.event.insertOne({
      ...base,
      _id: mongoService.objectId(base._id!),
    });

    // link instances to base
    instances.forEach((i) =>
      Object.assign(i, { recurrence: { eventId: insertedId.toString() } }),
    );

    await mongoService.event.insertMany(allEvents);
  });

  afterAll(cleanupTestDb);

  it("returns events by provided user only", async () => {
    const filter = getReadAllFilter(userId, {
      start: "1999-01-01",
      end: "2039-12-12",
    });
    const events = await mongoService.event.find(filter).toArray();
    events.forEach((e) => expect(e.user).toBe(userId));
  });
  it("does NOT transform query dates to ISO format", () => {
    /*
    it shouldn't transform the format, because mongo
    will do that during its date comparison

    this depends on the frontend passing the date values in the correct format
     */
    const start = "2011-10-20T00:00:00-10:00";
    const end = "2011-11-26T00:00:00-10:00";
    const filter = getReadAllFilter("123user", {
      start,
      end,
    });
    const flatFilter = _flatten(filter, {}) as Filter<Schema_Event>;
    expect(flatFilter["$lte"]).not.toEqual(new Date(start).toISOString());
    expect(flatFilter["$gte"]).not.toEqual(new Date(end).toISOString());
  });

  describe("Recurring Events", () => {
    it("Does not return the base event - just instances", async () => {
      const filter = getReadAllFilter(userId, {
        start: "1999-01-01",
        end: "2099-01-01",
      });

      const result = await mongoService.event.find(filter).toArray();

      // base is not returned
      const baseEvents = result.filter(isBase);
      expect(baseEvents).toHaveLength(0);

      const instances = result.filter(isExistingInstance);
      expect(instances).toHaveLength(gInstances.length);
    });

    it("excludes base calendar recurring events when someday=false", async () => {
      // Create a base calendar recurring event (isSomeday: false)
      const baseCalendarRecurringEvent = {
        user: userId,
        title: "Base Calendar Recurring Event",
        isSomeday: false,
        startDate: "2023-10-01T10:00:00Z",
        endDate: "2023-10-01T11:00:00Z",
        recurrence: {
          rule: ["RRULE:FREQ=WEEKLY;COUNT=5"],
        },
      };

      // Insert the test event
      await mongoService.event.insertOne(baseCalendarRecurringEvent);

      // Query for calendar events (not someday)
      const filter = getReadAllFilter(userId, {
        start: "2023-10-01",
        end: "2023-10-31",
      });
      const result = await mongoService.event.find(filter).toArray();

      // Should NOT include the base calendar recurring event
      const baseCalendarRecurringEvents = result.filter(
        (e) => e.isSomeday === false && e.recurrence?.rule,
      );

      expect(baseCalendarRecurringEvents).toHaveLength(0);
      const titles = result.map((e) => e.title);
      expect(titles).not.toContain("Base Calendar Recurring Event");
    });
  });

  describe("finds events with exact same timestamps", () => {
    test("format: TZ offset", async () => {
      const filter = getReadAllFilter(userId, {
        // make sure these match text data exactly
        start: "2022-01-01T00:00:00+03:00",
        end: "2022-01-020T11:11:11+03:00",
      });

      const result = await mongoService.event.find(filter).toArray();
      const titles = result.map((e) => e.title);
      expect(titles.includes("Jan 1 (times)")).toBe(true);
    });
    test("format: UTC", async () => {
      const filter = getReadAllFilter(userId, {
        // make sure these match text data exactly
        start: "2022-01-01T00:11:00Z",
        end: "2022-01-02T00:12:00Z",
      });

      const result = await mongoService.event.find(filter).toArray();
      const titles = result.map((e) => e.title);
      expect(titles.includes("Jan 1 (UTC times)")).toBe(true);
    });
  });

  describe("finds event within 1 day", () => {
    it("format: TZ offset with +", async () => {
      const tzOffsetFilter = getReadAllFilter(userId, {
        start: "2022-01-01T00:00:00+03:00",
        end: "2022-01-01T23:59:59+03:00",
      });

      const offsetResult = await mongoService.event
        .find(tzOffsetFilter)
        .toArray();
      const offsetTitles = offsetResult.map((e) => e.title);
      expect(offsetTitles.includes("Jan 1 (times)")).toBe(true);
    });

    it("format: TZ offset with -", async () => {
      const filter = getReadAllFilter(userId, {
        start: "2022-01-01T00:00:00-07:00",
        end: "2022-01-03T00:00:00-07:00",
      });

      const result = await mongoService.event.find(filter).toArray();
      _jan1ToJan3Assertions(result);
    });
  });

  it("finds events within days range: UTC", async () => {
    const filter = getReadAllFilter(userId, {
      start: "2022-01-01T00:00:00Z",
      end: "2022-01-03T00:00:00Z",
    });

    const result = await mongoService.event.find(filter).toArray();
    _jan1ToJan3Assertions(result);
  });

  it("finds events within week range: TZ offset", async () => {
    const filter = getReadAllFilter(userId, {
      start: "2022-01-01T00:00:00+06:00",
      end: "2022-01-21T23:59:59+06:00",
    });

    const result = await mongoService.event.find(filter).toArray();
    const titles = result.map((e) => e.title);
    expect(titles.includes("Jan 1 - Jan 21")).toBe(true);
    expect(titles.includes("Jan 1 - Jan 21 (times)")).toBe(true);
  });

  it("finds events within month range: TZ offset", async () => {
    const filter = getReadAllFilter(userId, {
      start: "2022-01-01T00:00:00-02:00",
      end: "2022-04-20T23:59:59-02:00",
    });

    const result = await mongoService.event.find(filter).toArray();
    const titles = result.map((e) => e.title);

    expect(titles.includes("Jan 1 - Apr 20")).toBe(true);
    expect(titles.includes("Jan 1 - Apr 20 (times)")).toBe(true);
  });

  it("finds events within year range: TZ offset", async () => {
    const filter = getReadAllFilter(userId, {
      start: "2022-01-01T00:00:00-02:00",
      end: "2023-01-01T23:59:59-02:00",
    });

    const result = await mongoService.event.find(filter).toArray();
    const titles = result.map((e) => e.title);

    expect(titles.includes("Jan 1 2022 - Jan 1 2023")).toBe(true);
    expect(titles.includes("Jan 1 2022 - Jan 1 2023 (times)")).toBe(true);
  });

  describe("Someday Events", () => {
    it("excludes someday events by default", async () => {
      const filter = getReadAllFilter(userId, {}); // no someday query
      const result = await mongoService.event.find(filter).toArray();

      const somedayEvents = result.filter((e) => e.isSomeday === true);

      expect(somedayEvents).toHaveLength(0);
    });
    it("only returns someday events (not timed) when someday query provided", async () => {
      const filter = getReadAllFilter(userId, { someday: "true" });
      const result = await mongoService.event.find(filter).toArray();

      const somedayEvents = result.filter((e) => e.isSomeday === true);
      const onlyReturnsSomedayEvents = result.length === somedayEvents.length;
      expect(onlyReturnsSomedayEvents).toBe(true);
    });
    it("returns someday events when providing YYYY-MM-DD: week", async () => {
      const filter = getReadAllFilter(userId, {
        someday: "true",
        start: "2023-10-01",
        end: "2023-10-07",
      });

      const result = await mongoService.event.find(filter).toArray();

      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe("Beginning of Month");
    });
    it("honors TZ offset: week", async () => {
      const filter = getReadAllFilter(userId, {
        someday: "true",
        start: "2023-09-30T23:59:59-05:00",
        end: "2023-10-08T23:59:59-05:00",
      });

      const result = await mongoService.event.find(filter).toArray();
      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe("Beginning of Month");

      const filterOneSecLater = getReadAllFilter(userId, {
        someday: "true",
        start: "2023-10-01T00:00:00-05:00",
        end: "2023-10-08T23:59:59-05:00",
      });

      const result2 = await mongoService.event
        .find(filterOneSecLater)
        .toArray();
      expect(result2).toHaveLength(0);
    });
    it("returns someday events when providing hour-min-sec: month", async () => {
      const filter = getReadAllFilter(userId, {
        someday: "true",
        start: "2023-06-01",
        end: "2023-06-30",
      });

      const result = await mongoService.event.find(filter).toArray();

      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe("First Sunday of New Month");
    });

    describe("Multi-Month Events", () => {
      it("finds events that span 2 months: YMD", async () => {
        const filter = getReadAllFilter(userId, {
          someday: "true",
          start: "2023-05-28",
          end: "2023-06-03",
        });

        const result = await mongoService.event.find(filter).toArray();
        expect(result).toHaveLength(2);
        expect(result[0]?.title).toBe("Multi-Month 1");
        expect(result[1]?.title).toBe("Multi-Month 2");
      });
      it("finds events that span 2 months: HMS", async () => {
        const filter = getReadAllFilter(userId, {
          someday: "true",
          start: "2023-05-28T00:00:00-05:00",
          end: "2023-06-03T23:59:59-05:00",
        });

        const result = await mongoService.event.find(filter).toArray();
        expect(result).toHaveLength(1);
        expect(result[0]?.title).toBe("Multi-Month 1");
      });
      it("finds events that span 4 months", async () => {
        const filterYMD = getReadAllFilter(userId, {
          someday: "true",
          start: "2023-01-28",
          end: "2023-03-27",
        });

        const result = await mongoService.event.find(filterYMD).toArray();
        expect(result).toHaveLength(1);
        expect(result[0]?.title).toBe("Multi-Month 2");

        const filterHMS = getReadAllFilter(userId, {
          someday: "true",
          start: "2023-01-28T00:00:00-05:00",
          end: "2023-03-27T23:59:59-05:00",
        });

        const resultHMS = await mongoService.event.find(filterHMS).toArray();
        expect(resultHMS).toHaveLength(1);
        expect(result[0]?.title).toBe("Multi-Month 2");
      });
    });

    it("includes base someday recurring events when someday query provided", async () => {
      // Create a base someday recurring event
      const baseSomedayRecurringEvent = {
        user: userId,
        title: "Base Someday Recurring Event",
        isSomeday: true,
        startDate: "2023-10-01",
        endDate: "2023-10-02",
        recurrence: {
          rule: ["RRULE:FREQ=WEEKLY;COUNT=5"],
        },
      };

      // Insert the test event
      await mongoService.event.insertOne(baseSomedayRecurringEvent);

      // Query for someday events
      const filter = getReadAllFilter(userId, { someday: "true" });
      const result = await mongoService.event.find(filter).toArray();

      // Should include the base someday recurring event
      const baseSomedayRecurringEvents = result.filter(
        (e) => e.isSomeday === true && e.recurrence?.rule,
      );

      expect(baseSomedayRecurringEvents.length).toBeGreaterThan(0);
      const titles = baseSomedayRecurringEvents.map((e) => e.title);
      expect(titles).toContain("Base Someday Recurring Event");
    });
  });
});

const _jan1ToJan3Assertions = (
  result: Array<WithId<Omit<Schema_Event, "_id">>>,
) => {
  const titles = result.map((e) => e.title!);

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

/* useful for deeply nested objects, like Mongo filters */
const _flatten = (
  obj: Record<string, unknown>,
  out: Record<string, unknown>,
) => {
  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] == "object") {
      out = _flatten(obj[key] as Record<string, unknown>, out); // recursively call for nesteds
    } else {
      out[key] = obj[key]; // direct assign for values
    }
  });
  return out;
};
