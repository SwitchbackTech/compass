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
  setupGoogleUser,
} from "@backend/sync/services/event-propagation/__tests__/event-propagation.test-helpers";

/**
 * Scope "thisAndFollowing" -- ported from the deleted
 * compass-to-google.this-and-following-event.test.ts (4 tests). B6: the
 * series still splits (truncate the old base's UNTIL + create a new base for
 * the target occurrence onward). Two Google effects follow from that split:
 * a patch on the OLD base (new UNTIL) and a create for the NEW base (its own
 * fresh RRULE, no externalReference yet). The instances re-materialized
 * under the new base are never individually pushed to Google (same guard as
 * the "all"/base suites).
 */
describe("CompassToGoogleEventPropagation - scope 'thisAndFollowing'", () => {
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
    const base = await eventService.readById(userId, created._id.toHexString());
    const instances = await mongoService.event
      .find({ "recurrence.seriesId": base._id })
      .sort({ "schedule.start": 1 })
      .toArray();
    return { base, instances };
  };

  it("patches the old base's UNTIL and creates a new base for a split replace", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    const { base, instances } = await seedSyncedSeries(
      user._id.toString(),
      calendar._id.toHexString(),
    );
    const splitPoint = instances[1]!; // third occurrence overall

    const patchSpy = jest.spyOn(gcalService, "patchEvent");
    const createSpy = jest.spyOn(gcalService, "createEvent");
    patchSpy.mockClear();
    createSpy.mockClear();

    const newBase = await eventService.replace(
      user._id.toString(),
      splitPoint._id.toHexString(),
      {
        content: {
          kind: "details",
          title: "Weekly sync (new time)",
          description: "",
        },
        schedule: {
          kind: "timed",
          start: "2026-08-04T16:00:00-06:00",
          end: "2026-08-04T17:00:00-06:00",
          timeZone: "America/Denver" as never,
        },
        recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"] },
        priority: "unassigned",
        scope: "thisAndFollowing",
      },
    );

    // Old base: patched with a truncated (UNTIL) RRULE, same Google event id.
    expect(patchSpy).toHaveBeenCalledTimes(1);
    const [, oldCalendarIdArg, oldEventIdArg, oldBody] =
      patchSpy.mock.calls[0]!;
    expect(oldCalendarIdArg).toBe(calendar.source.calendarId);
    expect(oldEventIdArg).toBe(base.externalReference?.eventId);
    expect(oldBody.recurrence?.[0]).toEqual(expect.stringContaining("UNTIL="));

    // New base: a fresh Google event, not linked to the old one.
    expect(createSpy).toHaveBeenCalledTimes(1);
    const [, newCalendarIdArg, newBody] = createSpy.mock.calls[0]!;
    expect(newCalendarIdArg).toBe(calendar.source.calendarId);
    expect(newBody).toMatchObject({
      summary: "Weekly sync (new time)",
      recurrence: ["RRULE:FREQ=WEEKLY;COUNT=3"],
    });

    const persistedNewBase = await eventService.readById(
      user._id.toString(),
      newBase._id.toHexString(),
    );
    expect(persistedNewBase.externalReference).toMatchObject({
      provider: "google",
    });
    expect(persistedNewBase.externalReference?.eventId).not.toBe(
      base.externalReference?.eventId,
    );
  });

  it("patches only the old base's UNTIL for a split delete (no new base to create)", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    const { base, instances } = await seedSyncedSeries(
      user._id.toString(),
      calendar._id.toHexString(),
    );
    const splitPoint = instances[1]!;

    const patchSpy = jest.spyOn(gcalService, "patchEvent");
    const createSpy = jest.spyOn(gcalService, "createEvent");
    const deleteSpy = jest.spyOn(gcalService, "deleteEvent");
    patchSpy.mockClear();
    createSpy.mockClear();
    deleteSpy.mockClear();

    await eventService.delete(
      user._id.toString(),
      splitPoint._id.toHexString(),
      {
        scope: "thisAndFollowing",
      },
    );

    expect(patchSpy).toHaveBeenCalledTimes(1);
    const [, calendarIdArg, eventIdArg, body] = patchSpy.mock.calls[0]!;
    expect(calendarIdArg).toBe(calendar.source.calendarId);
    expect(eventIdArg).toBe(base.externalReference?.eventId);
    expect(body.recurrence?.[0]).toEqual(expect.stringContaining("UNTIL="));

    expect(createSpy).not.toHaveBeenCalled();
    // Following instances have no externalReference of their own (see
    // base.test.ts); Google drops them itself once the base's UNTIL moves
    // earlier, so Compass never issues a per-instance delete.
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it("creates (never patches) both halves of a split when the original series was never synced", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    const createFailSpy = jest
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
    createFailSpy.mockRestore();

    const [base] = await mongoService.event
      .find({ "recurrence.kind": "series" })
      .toArray();
    const [splitPoint] = await mongoService.event
      .find({ "recurrence.seriesId": base!._id })
      .sort({ "schedule.start": 1 })
      .toArray();

    const patchSpy = jest.spyOn(gcalService, "patchEvent");
    const createSpy = jest.spyOn(gcalService, "createEvent");
    patchSpy.mockClear();
    createSpy.mockClear();

    await eventService.replace(
      user._id.toString(),
      splitPoint!._id.toHexString(),
      {
        content: {
          kind: "details",
          title: "Untouched by Google",
          description: "",
        },
        schedule: {
          kind: "timed",
          start: "2026-08-04T16:00:00-06:00",
          end: "2026-08-04T17:00:00-06:00",
          timeZone: "America/Denver" as never,
        },
        recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=2"] },
        priority: "unassigned",
        scope: "thisAndFollowing",
      },
    );

    // The old (truncated) base has no externalReference (its own create
    // failed above), so propagateUpsert has no known Google id to patch --
    // it lazily creates a Google copy for it, same as the fresh new base.
    // Neither half of the split had a prior Google identity, so nothing
    // is ever patched.
    expect(patchSpy).not.toHaveBeenCalled();
    expect(createSpy).toHaveBeenCalledTimes(2);
  });
});
