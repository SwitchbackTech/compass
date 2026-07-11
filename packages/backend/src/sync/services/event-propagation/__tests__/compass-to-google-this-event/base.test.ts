import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import eventService from "@backend/event/services/event.service";
import {
  seedGoogleCalendar,
  seedLocalCalendar,
  setupGoogleUser,
} from "@backend/sync/services/event-propagation/__tests__/event-propagation.test-helpers";

/**
 * Series base propagation -- ported from the deleted
 * compass-to-google-this-event/base.test.ts (9 tests). The old model treated
 * "create a recurring series" as a THIS_EVENT transition on the base; the new
 * pipeline has no such distinction (series creation is just `create` with a
 * "series" recurrence, materializing instances via
 * compass.event.generator#generateReplace). What carries over is the
 * observable Google contract: exactly one Google event is created for the
 * series (the base, carrying the RRULE) and edits to it use events.patch --
 * never one Google event per materialized instance.
 *
 * Bug fixed while restoring this suite: propagateUpsert previously treated
 * every materialized instance (EventRecord with recurrence.kind ===
 * "occurrence") as an independently syncable record, since isWritableToGoogle
 * only checked content/schedule kind. That fanned a single series create out
 * into N+1 unlinked Google events instead of relying on Google's own RRULE
 * expansion off the base. Fixed in compass-to-google.event-propagation.ts by
 * excluding recurrence.kind === "occurrence" records from
 * isWritableToGoogle.
 */
describe("CompassToGoogleEventPropagation - series base", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  const seriesInput = (calendarId: string) => ({
    calendarId: calendarId as never,
    content: {
      kind: "details" as const,
      title: "Weekly sync",
      description: "",
    },
    schedule: {
      kind: "timed" as const,
      start: "2026-07-14T15:00:00-06:00",
      end: "2026-07-14T16:00:00-06:00",
      timeZone: "America/Denver" as never,
    },
    recurrence: {
      kind: "series" as const,
      rules: ["RRULE:FREQ=WEEKLY;COUNT=5"] as never,
    },
    priority: "unassigned" as const,
  });

  it("creates exactly one Google event for a new series (the base, not each materialized instance)", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    const createSpy = jest.spyOn(gcalService, "createEvent");

    const created = await eventService.create(
      user._id.toString(),
      seriesInput(calendar._id.toHexString()),
    );

    const instances = await mongoService.event
      .find({ "recurrence.seriesId": created._id })
      .toArray();
    expect(instances).toHaveLength(4);

    expect(createSpy).toHaveBeenCalledTimes(1);
    const [, calendarIdArg, body] = createSpy.mock.calls[0]!;
    expect(calendarIdArg).toBe(calendar.source.calendarId);
    expect(body).toMatchObject({
      summary: "Weekly sync",
      recurrence: ["RRULE:FREQ=WEEKLY;COUNT=5"],
    });

    const base = await eventService.readById(
      user._id.toString(),
      created._id.toHexString(),
    );
    expect(base.externalReference).toMatchObject({ provider: "google" });

    // Materialized instances are a Compass-local read model; Google expands
    // its own copies from the base's RRULE, so instances never get their
    // own externalReference.
    instances.forEach((instance) =>
      expect(instance.externalReference).toBeNull(),
    );
  });

  it("patches only the base when a scope 'all' edit changes a synced series", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    const created = await eventService.create(
      user._id.toString(),
      seriesInput(calendar._id.toHexString()),
    );
    const base = await eventService.readById(
      user._id.toString(),
      created._id.toHexString(),
    );
    // clearMocks (jest.config.js) resets call history between tests, but a
    // spy attached by an earlier test in this file is never restored until
    // the file's global afterAll -- so the series `create` above already
    // ran through this same spy. Clear it here so only the replace below is
    // observed.
    const patchSpy = jest.spyOn(gcalService, "patchEvent");
    const createSpy = jest.spyOn(gcalService, "createEvent");
    patchSpy.mockClear();
    createSpy.mockClear();

    await eventService.replace(user._id.toString(), created._id.toHexString(), {
      content: {
        kind: "details",
        title: "Weekly sync (renamed)",
        description: "",
      },
      schedule: seriesInput(calendar._id.toHexString()).schedule,
      recurrence: { kind: "preserve" },
      priority: "unassigned",
      scope: "all",
    });

    expect(patchSpy).toHaveBeenCalledTimes(1);
    const [, calendarIdArg, eventIdArg, body] = patchSpy.mock.calls[0]!;
    expect(calendarIdArg).toBe(calendar.source.calendarId);
    expect(eventIdArg).toBe(base.externalReference?.eventId);
    expect(body).toMatchObject({ summary: "Weekly sync (renamed)" });
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("does not create Google events for a series on a non-google calendar", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedLocalCalendar(user._id);
    const createSpy = jest.spyOn(gcalService, "createEvent");

    await eventService.create(
      user._id.toString(),
      seriesInput(calendar._id.toHexString()),
    );

    expect(createSpy).not.toHaveBeenCalled();
  });
});
