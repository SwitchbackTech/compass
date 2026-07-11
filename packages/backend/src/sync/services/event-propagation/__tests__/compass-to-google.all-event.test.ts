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
 * Scope "all" (full-series edits/deletes) -- ported from the deleted
 * compass-to-google.all-event.test.ts (9 tests) against the new pipeline.
 * Per compass.event.generator#generateReplace and the propagateUpsert fix
 * documented in compass-to-google-this-event/base.test.ts, a full-series
 * replace re-materializes every instance in Mongo but propagates exactly one
 * Google effect (a patch on the base) -- Google re-expands the RRULE on its
 * own side. A full-series delete likewise issues exactly one Google delete
 * (against the base), which cascades Google's own instance copies.
 */
describe("CompassToGoogleEventPropagation - scope 'all' - full series", () => {
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

  const seedSyncedSeries = async (userId: string, calendarId: string) => {
    const created = await eventService.create(userId, seriesInput(calendarId));
    return eventService.readById(userId, created._id.toHexString());
  };

  it("patches the base once when scope 'all' shrinks the RRULE (fewer instances)", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    const base = await seedSyncedSeries(
      user._id.toString(),
      calendar._id.toHexString(),
    );
    const patchSpy = jest.spyOn(gcalService, "patchEvent");
    const deleteSpy = jest.spyOn(gcalService, "deleteEvent");
    patchSpy.mockClear();
    deleteSpy.mockClear();

    await eventService.replace(user._id.toString(), base._id.toHexString(), {
      content: { kind: "details", title: "Weekly sync", description: "" },
      schedule: seriesInput(calendar._id.toHexString()).schedule,
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=2"] },
      priority: "unassigned",
      scope: "all",
    });

    const remainingInstances = await mongoService.event
      .find({ "recurrence.seriesId": base._id })
      .toArray();
    expect(remainingInstances).toHaveLength(1);

    expect(patchSpy).toHaveBeenCalledTimes(1);
    const [, , eventIdArg, body] = patchSpy.mock.calls[0]!;
    expect(eventIdArg).toBe(base.externalReference?.eventId);
    expect(body).toMatchObject({ recurrence: ["RRULE:FREQ=WEEKLY;COUNT=2"] });
    // Google re-expands the patched RRULE on its own; Compass never deletes
    // the dropped occurrences' Google copies individually (they never had
    // one -- see base.test.ts).
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it("deletes the base once for scope 'all', not once per instance", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    const base = await seedSyncedSeries(
      user._id.toString(),
      calendar._id.toHexString(),
    );
    const deleteSpy = jest.spyOn(gcalService, "deleteEvent");
    deleteSpy.mockClear();

    await eventService.delete(user._id.toString(), base._id.toHexString(), {
      scope: "all",
    });

    expect(deleteSpy).toHaveBeenCalledTimes(1);
    const [, calendarIdArg, eventIdArg] = deleteSpy.mock.calls[0]!;
    expect(calendarIdArg).toBe(calendar.source.calendarId);
    expect(eventIdArg).toBe(base.externalReference?.eventId);

    const remaining = await mongoService.event
      .find({
        $or: [{ _id: base._id }, { "recurrence.seriesId": base._id }],
      })
      .toArray();
    expect(remaining).toHaveLength(0);
  });

  it("does not call Google when deleting a series that was never synced", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    const createSpy = jest
      .spyOn(gcalService, "createEvent")
      .mockImplementationOnce(async () => {
        throw new Error("simulated provider outage during create");
      });

    await expect(
      eventService.create(
        user._id.toString(),
        seriesInput(calendar._id.toHexString()),
      ),
    ).rejects.toMatchObject({ mutationCode: "PROVIDER_FAILURE" });
    createSpy.mockRestore();

    const [base] = await mongoService.event
      .find({ "recurrence.kind": "series" })
      .toArray();
    expect(base).toBeDefined();
    expect(base!.externalReference).toBeNull();

    const deleteSpy = jest.spyOn(gcalService, "deleteEvent");
    await eventService.delete(user._id.toString(), base!._id.toHexString(), {
      scope: "all",
    });

    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it("does not call Google for a scope 'all' edit on a non-google calendar", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedLocalCalendar(user._id);
    const created = await eventService.create(
      user._id.toString(),
      seriesInput(calendar._id.toHexString()),
    );
    const patchSpy = jest.spyOn(gcalService, "patchEvent");
    const createSpy = jest.spyOn(gcalService, "createEvent");
    patchSpy.mockClear();
    createSpy.mockClear();

    await eventService.replace(user._id.toString(), created._id.toHexString(), {
      content: { kind: "details", title: "Renamed", description: "" },
      schedule: seriesInput(calendar._id.toHexString()).schedule,
      recurrence: { kind: "preserve" },
      priority: "unassigned",
      scope: "all",
    });

    expect(patchSpy).not.toHaveBeenCalled();
    expect(createSpy).not.toHaveBeenCalled();
  });
});
