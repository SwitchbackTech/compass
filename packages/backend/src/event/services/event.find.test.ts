import { ObjectId } from "mongodb";
import { mockEventSetJan22 } from "@core/__mocks__/v1/events/events.22jan";
import { mockEventSetSomeday1 } from "@core/__mocks__/v1/events/events.someday.1";
import { MapGCalEvent } from "@core/mappers/map.gcal.event";
import { CompassCalendarSchema } from "@core/types/calendar.types";
import {
  Categories_Recurrence,
  EventStatus,
  RecurringEventUpdateScope,
  Schema_Event,
  ThisEventUpdate,
  TransitionCategoriesRecurrence,
} from "@core/types/event.types";
import { zObjectId } from "@core/types/type.utils";
import dayjs from "@core/util/date/dayjs";
import { isBase, isInstance } from "@core/util/event/event.util";
import { createMockBaseEvent } from "@core/util/test/ccal.event.factory";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import {
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import {
  mockRecurringGcalBaseEvent,
  mockRecurringGcalInstances,
} from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import mongoService from "@backend/common/services/mongo.service";
import { testCompassSeries } from "@backend/event/classes/compass.event.parser.test.util";
import { getReadAllFilter } from "@backend/event/services/event.service.util";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";

describe("Jan 2022: Many Formats", () => {
  const gBase = mockRecurringGcalBaseEvent({}, false, { count: 10 });
  const gInstances = mockRecurringGcalInstances(gBase);
  const calendar = zObjectId.parse(mockEventSetJan22[0]?.calendar);

  const recurrence = MapGCalEvent.toEvents(calendar, [gBase, ...gInstances]);

  const allEvents: Array<Schema_Event> = [
    ...mockEventSetJan22,
    ...mockEventSetSomeday1,
    ...recurrence.slice(1),
  ];

  beforeAll(async () => {
    await setupTestDb();

    await mongoService.event.insertMany(allEvents);
  });

  afterAll(cleanupTestDb);

  it("returns events by provided calendar only", async () => {
    const filter = getReadAllFilter(calendar, {
      startDate: dayjs("1999-01-01").toDate(),
      endDate: dayjs("2039-12-12").toDate(),
    });
    const events = await mongoService.event.find(filter).toArray();
    events.forEach((e) => expect(e.calendar.equals(calendar)).toBe(true));
  });

  it("finds events within days range: UTC", async () => {
    const filter = getReadAllFilter(calendar, {
      startDate: dayjs("2022-01-01T00:00:00Z").toDate(),
      endDate: dayjs("2022-01-03T00:00:00Z").toDate(),
    });

    const result = await mongoService.event.find(filter).toArray();
    _jan1ToJan3Assertions(result);
  });

  it("finds events within week range: TZ offset", async () => {
    const filter = getReadAllFilter(calendar, {
      startDate: dayjs("2022-01-01T00:00:00+06:00").toDate(),
      endDate: dayjs("2022-01-21T23:59:59+06:00").toDate(),
    });

    const result = await mongoService.event.find(filter).toArray();
    const titles = result.map((e) => e.title);
    expect(titles.includes("Jan 1 - Jan 21")).toBe(true);
    expect(titles.includes("Jan 1 - Jan 21 (times)")).toBe(true);
  });

  it("finds events within month range: TZ offset", async () => {
    const filter = getReadAllFilter(calendar, {
      startDate: dayjs("2022-01-01T00:00:00-02:00").toDate(),
      endDate: dayjs("2022-04-20T23:59:59-02:00").toDate(),
    });

    const result = await mongoService.event.find(filter).toArray();
    const titles = result.map((e) => e.title);

    expect(titles.includes("Jan 1 - Apr 20")).toBe(true);
    expect(titles.includes("Jan 1 - Apr 20 (times)")).toBe(true);
  });

  it("finds events within year range: TZ offset", async () => {
    const filter = getReadAllFilter(calendar, {
      startDate: dayjs("2022-01-01T00:00:00-02:00").toDate(),
      endDate: dayjs("2023-01-01T23:59:59-02:00").toDate(),
    });

    const result = await mongoService.event.find(filter).toArray();
    const titles = result.map((e) => e.title);

    expect(titles.includes("Jan 1 2022 - Jan 1 2023")).toBe(true);
    expect(titles.includes("Jan 1 2022 - Jan 1 2023 (times)")).toBe(true);
  });

  describe("Recurring Events", () => {
    it("Does not return the base event - just instances", async () => {
      const filter = getReadAllFilter(calendar, {
        startDate: dayjs("1999-01-01").toDate(),
        endDate: dayjs("2099-01-01").toDate(),
      });

      const result = await mongoService.event.find(filter).toArray();

      // base is not returned
      const baseEvents = result.filter(isBase);
      expect(baseEvents).toHaveLength(0);

      const filteredInstances = result.filter(isInstance);
      expect(filteredInstances).toHaveLength(gInstances.length);
    });

    it("excludes base calendar recurring events when someday=false", async () => {
      // Create a base calendar recurring event (isSomeday: false)
      const baseCalendarRecurringEvent = createMockBaseEvent({
        calendar,
        isSomeday: false,
      });

      // Insert the test event
      await mongoService.event.insertOne({
        ...baseCalendarRecurringEvent,
        _id: baseCalendarRecurringEvent._id,
      });

      // Query for calendar events (not someday)
      const filter = getReadAllFilter(calendar, {
        startDate: dayjs("2023-10-01").toDate(),
        endDate: dayjs("2023-10-31").toDate(),
      });
      const result = await mongoService.event.find(filter).toArray();

      // Should NOT include the base calendar recurring event
      const baseCalendarRecurringEvents = result.filter(
        (e) => isBase(e) && e.isSomeday === false,
      );

      expect(baseCalendarRecurringEvents).toHaveLength(0);
    });
  });

  describe("finds events with exact same timestamps", () => {
    it("format: TZ offset", async () => {
      const filter = getReadAllFilter(calendar, {
        // make sure these match text data exactly
        startDate: dayjs("2022-01-01T00:00:00+03:00").toDate(),
        endDate: dayjs("2022-01-02T11:11:11+03:00").toDate(),
      });

      const result = await mongoService.event.find(filter).toArray();
      const titles = result.map((e) => e.title);
      expect(titles.includes("Jan 1 (times)")).toBe(true);
    });
    it("format: UTC", async () => {
      const filter = getReadAllFilter(calendar, {
        // make sure these match text data exactly
        startDate: dayjs("2022-01-01T00:11:00Z").toDate(),
        endDate: dayjs("2022-01-02T00:12:00Z").toDate(),
      });

      const result = await mongoService.event.find(filter).toArray();
      const titles = result.map((e) => e.title);
      expect(titles.includes("Jan 1 (UTC times)")).toBe(true);
    });
  });

  describe("finds event within 1 day", () => {
    it("format: TZ offset with +", async () => {
      const tzOffsetFilter = getReadAllFilter(calendar, {
        startDate: dayjs("2022-01-01T00:00:00+03:00").toDate(),
        endDate: dayjs("2022-01-01T23:59:59+03:00").toDate(),
      });

      const offsetResult = await mongoService.event
        .find(tzOffsetFilter)
        .toArray();
      const offsetTitles = offsetResult.map((e) => e.title);
      expect(offsetTitles.includes("Jan 1 (times)")).toBe(true);
    });

    it("format: TZ offset with -", async () => {
      const filter = getReadAllFilter(calendar, {
        startDate: dayjs("2022-01-01T00:00:00-07:00").toDate(),
        endDate: dayjs("2022-01-03T00:00:00-07:00").toDate(),
      });

      const result = await mongoService.event.find(filter).toArray();
      _jan1ToJan3Assertions(result);
    });
  });

  describe("Someday Events", () => {
    it("excludes someday events by default", async () => {
      const filter = getReadAllFilter(calendar, {}); // no someday query
      const result = await mongoService.event.find(filter).toArray();

      const somedayEvents = result.filter((e) => e.isSomeday === true);

      expect(somedayEvents).toHaveLength(0);
    });
    it("only returns someday events (not timed) when someday query provided", async () => {
      const filter = getReadAllFilter(calendar, { isSomeday: true });
      const result = await mongoService.event.find(filter).toArray();

      const somedayEvents = result.filter((e) => e.isSomeday === true);
      const onlyReturnsSomedayEvents = result.length === somedayEvents.length;
      expect(onlyReturnsSomedayEvents).toBe(true);
    });
    it("returns someday events when providing YYYY-MM-DD: week", async () => {
      const filter = getReadAllFilter(calendar, {
        isSomeday: true,
        startDate: dayjs("2023-10-01").toDate(),
        endDate: dayjs("2023-10-07").toDate(),
      });

      const result = await mongoService.event.find(filter).toArray();

      expect(result.every((e) => e.isSomeday)).toBe(true);
    });
    it("honors TZ offset: week", async () => {
      const filter = getReadAllFilter(calendar, {
        isSomeday: true,
        startDate: dayjs("2023-09-30T23:59:59-05:00").toDate(),
        endDate: dayjs("2023-10-08T23:59:59-05:00").toDate(),
      });

      const result = await mongoService.event.find(filter).toArray();

      expect(result.every((e) => e.isSomeday)).toBe(true);

      const filterOneSecLater = getReadAllFilter(calendar, {
        isSomeday: true,
        startDate: dayjs("2023-10-01T00:00:00-05:00").toDate(),
        endDate: dayjs("2023-10-08T23:59:59-05:00").toDate(),
      });

      const result2 = await mongoService.event
        .find(filterOneSecLater)
        .toArray();
      expect(result2).toHaveLength(1);
      expect(
        result2.find((e) => e.title === "Beginning of Month"),
      ).toBeDefined();
    });
    it("returns someday events when providing hour-min-sec: month", async () => {
      const filter = getReadAllFilter(calendar, {
        isSomeday: true,
        startDate: dayjs("2023-06-01").toDate(),
        endDate: dayjs("2023-06-30").toDate(),
      });

      const result = await mongoService.event.find(filter).toArray();

      expect(result.every((e) => e.isSomeday)).toBe(true);
      expect(
        result.find((e) => e.title === "First Sunday of New Month"),
      ).toBeDefined();
    });

    describe("Multi-Month Events", () => {
      it("finds events that span 2 months: YMD", async () => {
        const filter = getReadAllFilter(calendar, {
          isSomeday: true,
          startDate: dayjs("2023-05-28").toDate(),
          endDate: dayjs("2023-06-03").toDate(),
        });

        const result = await mongoService.event.find(filter).toArray();

        expect(result.filter((e) => !isInstance(e))).toHaveLength(2);
        expect(result.find((e) => e.title === "Multi-Month 1")).toBeDefined();
        expect(result.find((e) => e.title === "Multi-Month 2")).toBeDefined();
      });
      it("finds events that span 2 months: HMS", async () => {
        const filter = getReadAllFilter(calendar, {
          isSomeday: true,
          startDate: dayjs("2023-05-28T00:00:00-05:00").toDate(),
          endDate: dayjs("2023-06-03T23:59:59-05:00").toDate(),
        });

        const result = await mongoService.event.find(filter).toArray();
        expect(result).toHaveLength(3);
        expect(result[0]?.title).toBe("Multi-Month 1");
      });
      it("finds events that span 4 months", async () => {
        const filterYMD = getReadAllFilter(calendar, {
          isSomeday: true,
          startDate: dayjs("2023-01-28").toDate(),
          endDate: dayjs("2023-03-27").toDate(),
        });

        const result = await mongoService.event.find(filterYMD).toArray();
        expect(result).toHaveLength(1);
        expect(result[0]?.title).toBe("Multi-Month 2");

        const filterHMS = getReadAllFilter(calendar, {
          isSomeday: true,
          startDate: dayjs("2023-01-28T00:00:00-05:00").toDate(),
          endDate: dayjs("2023-03-27T23:59:59-05:00").toDate(),
        });

        const resultHMS = await mongoService.event.find(filterHMS).toArray();
        expect(resultHMS).toHaveLength(1);
        expect(result[0]?.title).toBe("Multi-Month 2");
      });
    });

    it("excludes base someday recurring events when someday query provided", async () => {
      // Create a base someday recurring event
      const baseSomedayRecurringEvent = createMockBaseEvent({
        calendar,
        isSomeday: true,
      });

      // Insert the test event
      await mongoService.event.insertOne({
        ...baseSomedayRecurringEvent,
        _id: new ObjectId(baseSomedayRecurringEvent._id),
      });

      // Query for someday events
      const filter = getReadAllFilter(calendar, { isSomeday: true });
      const result = await mongoService.event.find(filter).toArray();

      // Should exclude the base someday recurring event
      const baseSomedayRecurringEvents = result.filter(
        (e) => isBase(e) && e.isSomeday,
      );

      expect(baseSomedayRecurringEvents).toHaveLength(0);
    });

    it("includes instance someday recurring events when someday query provided", async () => {
      // Create a base someday recurring event
      const _user = await AuthDriver.googleSignup();
      const _calendar = await mongoService.calendar.findOne({
        user: _user._id,
      });

      expect(_calendar).toBeDefined();
      expect(_calendar).not.toBeNull();

      const calendar = CompassCalendarSchema.parse(_calendar);
      const isSomeday = true;
      const recurrence = { rule: ["RRULE:FREQ=WEEKLY;COUNT=10"] };
      const payload = createMockBaseEvent({
        isSomeday,
        calendar: calendar._id,
        recurrence,
      });

      const changes = await CompassSyncProcessor.processEvents([
        {
          calendar,
          providerSync: true,
          payload: payload as ThisEventUpdate["payload"],
          applyTo: RecurringEventUpdateScope.THIS_EVENT,
          status: EventStatus.CONFIRMED,
        },
      ]);

      expect(changes).toEqual(
        expect.arrayContaining([
          {
            calendar: calendar._id,
            user: calendar.user,
            id: payload._id,
            title: payload.title,
            transition: [
              null,
              TransitionCategoriesRecurrence.RECURRENCE_BASE_SOMEDAY_CONFIRMED,
            ],
            category: Categories_Recurrence.RECURRENCE_BASE_SOMEDAY,
            operation: "SOMEDAY_SERIES_CREATED",
          },
        ]),
      );

      // check that event is in db
      await testCompassSeries(payload, 10);

      // Query for someday events
      const filter = getReadAllFilter(calendar._id, { isSomeday: true });
      const result = await mongoService.event.find(filter).toArray();

      // Should not include the base someday recurring event
      const baseSomedayRecurringEvents = result.filter(
        (e) => isBase(e) && e.isSomeday,
      );

      expect(baseSomedayRecurringEvents).toHaveLength(0);

      const instanceSomedayRecurringEvents = result.filter(
        (e) => isInstance(e) && e.isSomeday,
      );

      expect(instanceSomedayRecurringEvents.length).toBeGreaterThan(0);
    });
  });
});

const _jan1ToJan3Assertions = (result: Schema_Event[]) => {
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
  // expect(titles.includes("Jan 4")).toBe(false);
  expect(titles.includes("Jan 1 2023")).toBe(false);
};
