import { ObjectId } from "mongodb";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { eventRepository } from "@backend/event/event.repository";
import eventService from "@backend/event/services/event.service";
import {
  seedGoogleCalendar,
  setupGoogleUser,
  setupNoGoogleUser,
} from "@backend/sync/services/event-propagation/__tests__/event-propagation.test-helpers";
import { CompassToGoogleEventPropagation } from "@backend/sync/services/event-propagation/compass-to-google/compass-to-google.event-propagation";

/**
 * The transaction envelope (B7) -- ported from the deleted
 * compass-to-google.event-propagation.test.ts (8 tests). The OLD file tested
 * private static methods (getNotificationType, notifyClients, applyChange,
 * executeGoogleEffect) and the removed EVENT_CHANGED/SOMEDAY_EVENT_CHANGED
 * SSE constants -- none of that exists anymore (SSE notification is
 * eventService's `notify()` publishing `eventsChanged`, covered separately).
 * What's ported is the INTENT: Google effects run strictly after the Mongo
 * transaction commits, a mid-transaction Mongo failure means propagate()
 * never runs and the partial write is rolled back, a Google provider
 * failure surfaces PROVIDER_FAILURE without losing the already-committed
 * Mongo write, and a missing refresh token is swallowed silently.
 */
describe("CompassToGoogleEventPropagation - transaction envelope", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  const timedInput = (calendarId: string) => ({
    calendarId: calendarId as never,
    content: { kind: "details" as const, title: "Standup", description: "" },
    schedule: {
      kind: "timed" as const,
      start: "2026-07-14T15:00:00-06:00",
      end: "2026-07-14T16:00:00-06:00",
      timeZone: "America/Denver" as never,
    },
    recurrence: { kind: "single" as const },
    priority: "unassigned" as const,
  });

  it("runs the Google effect only after the Mongo write is durably committed", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    let sawCommittedWriteDuringGoogleCall = false;

    const createSpy = jest
      .spyOn(gcalService, "createEvent")
      .mockImplementationOnce(async () => {
        // Read through the *unmocked* driver (no session) -- if the Mongo
        // transaction had not actually committed yet, this read would race
        // it. Observing the row here proves propagate() runs strictly after
        // session.withTransaction resolves, not merely after the callback
        // returns inside an as-yet-uncommitted transaction.
        const rows = await mongoService.event
          .find({ calendarId: calendar._id })
          .toArray();
        sawCommittedWriteDuringGoogleCall = rows.length === 1;
        return { id: "gcal-id-1", recurringEventId: null };
      });

    await eventService.create(
      user._id.toString(),
      timedInput(calendar._id.toHexString()),
    );

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(sawCommittedWriteDuringGoogleCall).toBe(true);
  });

  it("never calls propagate, and rolls back the partial write, when the Mongo transaction fails", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    const propagateSpy = jest.spyOn(
      CompassToGoogleEventPropagation,
      "propagate",
    );
    const createEventSpy = jest.spyOn(gcalService, "createEvent");
    propagateSpy.mockClear();
    createEventSpy.mockClear();

    const bulkReplaceSpy = jest
      .spyOn(eventRepository, "bulkReplace")
      .mockImplementationOnce(async () => {
        throw new Error("simulated write conflict inside the transaction");
      });

    await expect(
      eventService.create(
        user._id.toString(),
        timedInput(calendar._id.toHexString()),
      ),
    ).rejects.toThrow("simulated write conflict inside the transaction");

    bulkReplaceSpy.mockRestore();

    expect(propagateSpy).not.toHaveBeenCalled();
    expect(createEventSpy).not.toHaveBeenCalled();

    const rows = await mongoService.event
      .find({ calendarId: calendar._id })
      .toArray();
    expect(rows).toHaveLength(0);
  });

  it("surfaces PROVIDER_FAILURE on a Google error, but keeps the already-committed Mongo write", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    const createSpy = jest
      .spyOn(gcalService, "createEvent")
      .mockImplementationOnce(async () => {
        throw new Error("simulated Google 500");
      });

    await expect(
      eventService.create(
        user._id.toString(),
        timedInput(calendar._id.toHexString()),
      ),
    ).rejects.toMatchObject({ mutationCode: "PROVIDER_FAILURE" });
    createSpy.mockRestore();

    const rows = await mongoService.event
      .find({ calendarId: calendar._id })
      .toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.externalReference).toBeNull();
  });

  it("swallows a missing-refresh-token failure silently: no throw, and the Mongo write stands", async () => {
    const { user } = await setupNoGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);

    await expect(
      eventService.create(
        user._id.toString(),
        timedInput(calendar._id.toHexString()),
      ),
    ).resolves.toMatchObject({ content: { title: "Standup" } });

    const rows = await mongoService.event
      .find({ calendarId: calendar._id })
      .toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.externalReference).toBeNull();
  });

  it("propagate() is a no-op when the change set is empty", async () => {
    const { user } = await setupGoogleUser();
    const createSpy = jest.spyOn(gcalService, "createEvent");
    const calendarFindSpy = jest.spyOn(mongoService.calendar, "find");
    createSpy.mockClear();
    calendarFindSpy.mockClear();

    await CompassToGoogleEventPropagation.propagate(user._id.toString(), {
      upserted: [],
      deletedBefore: [],
    });

    expect(createSpy).not.toHaveBeenCalled();
    // Short-circuits before even resolving owning calendars.
    expect(calendarFindSpy).not.toHaveBeenCalled();
  });

  it("does not call Google for a delete when the deleted record's calendar is unknown/inactive", async () => {
    const { user } = await setupGoogleUser();
    const deleteSpy = jest.spyOn(gcalService, "deleteEvent");
    deleteSpy.mockClear();

    const orphanedRecord = {
      _id: new ObjectId(),
      calendarId: new ObjectId(), // no matching CalendarRecord seeded
      content: { kind: "details" as const, title: "Orphan", description: "" },
      schedule: {
        kind: "timed" as const,
        start: new Date("2026-07-14T15:00:00.000Z"),
        end: new Date("2026-07-14T16:00:00.000Z"),
        timeZone: "America/Denver" as never,
      },
      recurrence: { kind: "single" as const },
      priority: "unassigned" as const,
      externalReference: {
        provider: "google" as const,
        eventId: "some-gcal-id",
        recurringEventId: null,
      },
      createdAt: new Date(),
      updatedAt: null,
    };

    await CompassToGoogleEventPropagation.propagate(user._id.toString(), {
      upserted: [],
      deletedBefore: [orphanedRecord],
    });

    expect(deleteSpy).not.toHaveBeenCalled();
  });
});
