import { ObjectId } from "mongodb";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { type EventRecord } from "@backend/event/event.record";
import { eventRepository } from "@backend/event/event.repository";
import { afterAll, beforeEach, describe, expect, it } from "bun:test";

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
        },
        [calendarId],
      );

      const ids = results.map((e) => e._id.toHexString());
      expect(ids).toContain(occurrence._id.toHexString());
      expect(ids).toContain(base._id.toHexString());
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
        },
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
        },
        [calendarId],
      );
      const offsetResults = await eventRepository.list(
        {
          kind: "range",
          start: "2026-07-13T18:00:00-06:00",
          end: "2026-07-14T18:00:00-06:00",
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

    it("finds a batch without crossing calendar ownership", async () => {
      const calendarA = new ObjectId();
      const calendarB = new ObjectId();
      const eventOnA = buildEvent({
        calendarId: calendarA,
        externalReference: {
          provider: "google",
          eventId: "event-a",
          recurringEventId: null,
        },
      });
      const eventOnB = buildEvent({
        calendarId: calendarB,
        externalReference: {
          provider: "google",
          eventId: "event-b",
          recurringEventId: null,
        },
      });
      await eventRepository.insertMany([eventOnA, eventOnB]);

      const found = await eventRepository.findByExternalReferences(calendarA, [
        "event-a",
        "event-b",
      ]);

      expect(found.map((event) => event._id.toHexString())).toEqual([
        eventOnA._id.toHexString(),
      ]);
    });
  });

  describe("findUnlinkedOccurrences", () => {
    it("finds timed and all-day anchors only within the requested series", async () => {
      const seriesId = new ObjectId();
      const otherSeriesId = new ObjectId();
      const timed = buildEvent({
        recurrence: { kind: "occurrence", seriesId },
      });
      const allDay = buildEvent({
        schedule: { kind: "allDay", start: "2026-07-15", end: "2026-07-16" },
        recurrence: { kind: "occurrence", seriesId },
      });
      const otherSeries = buildEvent({
        recurrence: { kind: "occurrence", seriesId: otherSeriesId },
      });
      const alreadyLinked = buildEvent({
        recurrence: { kind: "occurrence", seriesId },
        externalReference: {
          provider: "google",
          eventId: "linked",
          recurringEventId: "series",
        },
      });
      await eventRepository.insertMany([
        timed,
        allDay,
        otherSeries,
        alreadyLinked,
      ]);

      const found = await eventRepository.findUnlinkedOccurrences(seriesId, [
        new Date("2026-07-14T15:00:00.000Z"),
        new Date("2026-07-15T00:00:00.000Z"),
      ]);

      expect(found.map((event) => event._id.toHexString()).sort()).toEqual(
        [timed._id.toHexString(), allDay._id.toHexString()].sort(),
      );
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
