import { ObjectId } from "mongodb";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { type EventRecord } from "@backend/event/event.record";
import { eventRepository } from "@backend/event/event.repository";

const calendarId = new ObjectId();

const buildEvent = (overrides: Partial<EventRecord> = {}): EventRecord => ({
  _id: new ObjectId(),
  calendarId,
  content: { kind: "details", title: "Standup", description: "" },
  schedule: {
    kind: "timed",
    start: new Date("2026-07-14T15:00:00.000Z"),
    end: new Date("2026-07-14T16:00:00.000Z"),
    timeZone: "America/Denver",
  },
  recurrence: { kind: "single" },
  priority: "unassigned",
  externalReference: null,
  createdAt: new Date(),
  updatedAt: null,
  ...overrides,
});

describe("EventRepository", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  describe("list (B3 two-branch range read)", () => {
    it("returns timed events overlapping the range", async () => {
      const inRange = buildEvent();
      const outOfRange = buildEvent({
        schedule: {
          kind: "timed",
          start: new Date("2026-08-01T00:00:00.000Z"),
          end: new Date("2026-08-01T01:00:00.000Z"),
          timeZone: "America/Denver",
        },
      });
      await eventRepository.insertMany([inRange, outOfRange]);

      const results = await eventRepository.list(
        {
          kind: "range",
          start: "2026-07-14T00:00:00Z",
          end: "2026-07-15T00:00:00Z",
          priorities: [],
        },
        [calendarId],
      );

      expect(results.map((e) => e._id.toHexString())).toEqual([
        inRange._id.toHexString(),
      ]);
    });

    it("returns all-day events overlapping the range", async () => {
      const allDay = buildEvent({
        schedule: { kind: "allDay", start: "2026-07-14", end: "2026-07-16" },
      });
      await eventRepository.insertOne(allDay);

      const results = await eventRepository.list(
        {
          kind: "range",
          start: "2026-07-14T00:00:00Z",
          end: "2026-07-15T00:00:00Z",
          priorities: [],
        },
        [calendarId],
      );

      expect(results.map((e) => e._id.toHexString())).toContain(
        allDay._id.toHexString(),
      );
    });

    it("joins the series base for a returned occurrence", async () => {
      const base = buildEvent({
        recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY"] },
      });
      const occurrence = buildEvent({
        recurrence: { kind: "occurrence", seriesId: base._id },
      });
      await eventRepository.insertMany([base, occurrence]);

      const results = await eventRepository.list(
        {
          kind: "range",
          start: "2026-07-14T00:00:00Z",
          end: "2026-07-15T00:00:00Z",
          priorities: [],
        },
        [calendarId],
      );

      const ids = results.map((e) => e._id.toHexString());
      expect(ids).toContain(occurrence._id.toHexString());
      expect(ids).toContain(base._id.toHexString());
    });

    it("filters someday events by period and anchorDate", async () => {
      const someday = buildEvent({
        schedule: {
          kind: "someday",
          period: "week",
          anchorDate: "2026-07-13",
          sortOrder: 0,
        },
      });
      const otherPeriod = buildEvent({
        schedule: {
          kind: "someday",
          period: "month",
          anchorDate: "2026-07-01",
          sortOrder: 0,
        },
      });
      await eventRepository.insertMany([someday, otherPeriod]);

      const results = await eventRepository.list(
        { kind: "someday", period: "week", anchorDate: "2026-07-13" },
        [calendarId],
      );

      expect(results.map((e) => e._id.toHexString())).toEqual([
        someday._id.toHexString(),
      ]);
    });

    it("scopes reads to the owned calendar set only", async () => {
      const otherCalendarId = new ObjectId();
      const notOwned = buildEvent({ calendarId: otherCalendarId });
      await eventRepository.insertOne(notOwned);

      const results = await eventRepository.list(
        {
          kind: "range",
          start: "2026-07-14T00:00:00Z",
          end: "2026-07-15T00:00:00Z",
          priorities: [],
        },
        [calendarId],
      );

      expect(results).toHaveLength(0);
    });

    it("excludes a timed event that ends exactly at the range start (adjacent, not overlapping)", async () => {
      const adjacent = buildEvent({
        schedule: {
          kind: "timed",
          start: new Date("2026-07-13T14:00:00.000Z"),
          end: new Date("2026-07-14T00:00:00.000Z"),
          timeZone: "America/Denver",
        },
      });
      await eventRepository.insertOne(adjacent);

      const results = await eventRepository.list(
        {
          kind: "range",
          start: "2026-07-14T00:00:00Z",
          end: "2026-07-15T00:00:00Z",
          priorities: [],
        },
        [calendarId],
      );

      expect(results).toHaveLength(0);
    });

    it("excludes a timed event that starts exactly at the range end (adjacent, not overlapping)", async () => {
      const adjacent = buildEvent({
        schedule: {
          kind: "timed",
          start: new Date("2026-07-15T00:00:00.000Z"),
          end: new Date("2026-07-15T01:00:00.000Z"),
          timeZone: "America/Denver",
        },
      });
      await eventRepository.insertOne(adjacent);

      const results = await eventRepository.list(
        {
          kind: "range",
          start: "2026-07-14T00:00:00Z",
          end: "2026-07-15T00:00:00Z",
          priorities: [],
        },
        [calendarId],
      );

      expect(results).toHaveLength(0);
    });

    it("includes an all-day event that fully contains the range", async () => {
      const spanning = buildEvent({
        schedule: { kind: "allDay", start: "2026-07-01", end: "2026-08-01" },
      });
      await eventRepository.insertOne(spanning);

      const results = await eventRepository.list(
        {
          kind: "range",
          start: "2026-07-14T00:00:00Z",
          end: "2026-07-15T00:00:00Z",
          priorities: [],
        },
        [calendarId],
      );

      expect(results.map((e) => e._id.toHexString())).toContain(
        spanning._id.toHexString(),
      );
    });

    it("excludes an all-day event whose exclusive end lands exactly on the range start", async () => {
      const priorDay = buildEvent({
        schedule: { kind: "allDay", start: "2026-07-13", end: "2026-07-14" },
      });
      await eventRepository.insertOne(priorDay);

      const results = await eventRepository.list(
        {
          kind: "range",
          start: "2026-07-14T00:00:00Z",
          end: "2026-07-15T00:00:00Z",
          priorities: [],
        },
        [calendarId],
      );

      expect(results).toHaveLength(0);
    });

    it("filters both timed and all-day branches by priority", async () => {
      const timedSelf = buildEvent({ priority: "self" });
      const timedWork = buildEvent({ priority: "work" });
      const allDaySelf = buildEvent({
        priority: "self",
        schedule: { kind: "allDay", start: "2026-07-14", end: "2026-07-15" },
      });
      const allDayWork = buildEvent({
        priority: "work",
        schedule: { kind: "allDay", start: "2026-07-14", end: "2026-07-15" },
      });
      await eventRepository.insertMany([
        timedSelf,
        timedWork,
        allDaySelf,
        allDayWork,
      ]);

      const results = await eventRepository.list(
        {
          kind: "range",
          start: "2026-07-14T00:00:00Z",
          end: "2026-07-15T00:00:00Z",
          priorities: ["self"],
        },
        [calendarId],
      );

      const ids = results.map((e) => e._id.toHexString());
      expect(ids).toContain(timedSelf._id.toHexString());
      expect(ids).toContain(allDaySelf._id.toHexString());
      expect(ids).not.toContain(timedWork._id.toHexString());
      expect(ids).not.toContain(allDayWork._id.toHexString());
    });

    it("excludes someday events from a range query", async () => {
      const someday = buildEvent({
        schedule: {
          kind: "someday",
          period: "week",
          anchorDate: "2026-07-13",
          sortOrder: 0,
        },
      });
      await eventRepository.insertOne(someday);

      const results = await eventRepository.list(
        {
          kind: "range",
          start: "2026-07-14T00:00:00Z",
          end: "2026-07-15T00:00:00Z",
          priorities: [],
        },
        [calendarId],
      );

      expect(results).toHaveLength(0);
    });

    it("excludes timed/all-day events from a someday query", async () => {
      const timed = buildEvent();
      const allDay = buildEvent({
        schedule: { kind: "allDay", start: "2026-07-13", end: "2026-07-14" },
      });
      await eventRepository.insertMany([timed, allDay]);

      const results = await eventRepository.list(
        { kind: "someday", period: "week", anchorDate: "2026-07-13" },
        [calendarId],
      );

      expect(results).toHaveLength(0);
    });

    it("treats different UTC-offset representations of the same instant identically", async () => {
      const event = buildEvent({
        schedule: {
          kind: "timed",
          start: new Date("2026-07-14T15:00:00.000Z"),
          end: new Date("2026-07-14T16:00:00.000Z"),
          timeZone: "America/Denver",
        },
      });
      await eventRepository.insertOne(event);

      const utcResults = await eventRepository.list(
        {
          kind: "range",
          start: "2026-07-14T00:00:00Z",
          end: "2026-07-15T00:00:00Z",
          priorities: [],
        },
        [calendarId],
      );
      const offsetResults = await eventRepository.list(
        {
          kind: "range",
          start: "2026-07-13T18:00:00-06:00",
          end: "2026-07-14T18:00:00-06:00",
          priorities: [],
        },
        [calendarId],
      );

      expect(utcResults.map((e) => e._id.toHexString())).toEqual(
        offsetResults.map((e) => e._id.toHexString()),
      );
      expect(utcResults.map((e) => e._id.toHexString())).toContain(
        event._id.toHexString(),
      );
    });
  });

  describe("reorder", () => {
    it("only reorders someday events within the owned calendar set", async () => {
      const someday = buildEvent({
        schedule: {
          kind: "someday",
          period: "week",
          anchorDate: "2026-07-13",
          sortOrder: 0,
        },
      });
      await eventRepository.insertOne(someday);

      await eventRepository.reorder(
        [{ eventId: someday._id.toHexString(), sortOrder: 5 }],
        [calendarId],
      );

      const updated = await eventRepository.findById(someday._id, [calendarId]);
      expect(
        updated?.schedule.kind === "someday"
          ? updated.schedule.sortOrder
          : null,
      ).toBe(5);
    });
  });

  // Packet 05 tests list: "Same Google event id in two calendars." Scoping
  // the lookup by (calendarId, externalReference.eventId) together -- not
  // externalReference.eventId alone -- is what lets two different Compass
  // calendars each import their own event carrying an identical Google
  // event id without one calendar's record shadowing the other's.
  describe("findByExternalReference (scoped by calendar, step 5)", () => {
    it("returns only the owning calendar's event when two calendars share the same Google event id", async () => {
      const calendarA = new ObjectId();
      const calendarB = new ObjectId();
      const sharedGoogleEventId = "shared-gevent-1";

      const eventOnA = buildEvent({
        calendarId: calendarA,
        externalReference: {
          provider: "google",
          eventId: sharedGoogleEventId,
          recurringEventId: null,
        },
      });
      const eventOnB = buildEvent({
        calendarId: calendarB,
        externalReference: {
          provider: "google",
          eventId: sharedGoogleEventId,
          recurringEventId: null,
        },
      });
      await eventRepository.insertMany([eventOnA, eventOnB]);

      const foundOnA = await eventRepository.findByExternalReference(
        calendarA,
        sharedGoogleEventId,
      );
      const foundOnB = await eventRepository.findByExternalReference(
        calendarB,
        sharedGoogleEventId,
      );

      expect(foundOnA?._id.toHexString()).toBe(eventOnA._id.toHexString());
      expect(foundOnB?._id.toHexString()).toBe(eventOnB._id.toHexString());
      expect(foundOnA?._id.toHexString()).not.toBe(foundOnB?._id.toHexString());
    });
  });

  describe("deleteBySeriesId", () => {
    it("deletes the base and every occurrence", async () => {
      const base = buildEvent({
        recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY"] },
      });
      const occurrence = buildEvent({
        recurrence: { kind: "occurrence", seriesId: base._id },
      });
      await eventRepository.insertMany([base, occurrence]);

      await eventRepository.deleteBySeriesId(base._id);

      expect(await eventRepository.findById(base._id, [calendarId])).toBeNull();
      expect(
        await eventRepository.findById(occurrence._id, [calendarId]),
      ).toBeNull();
    });
  });
});
