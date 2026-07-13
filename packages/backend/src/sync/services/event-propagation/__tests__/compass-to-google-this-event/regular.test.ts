import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import gcalService from "@backend/common/services/gcal/gcal.service";
import eventService from "@backend/event/services/event.service";
import {
  buildEventRecord,
  seedGoogleCalendar,
  seedLocalCalendar,
  setupGoogleUser,
  setupNoGoogleUser,
} from "@backend/sync/services/event-propagation/__tests__/event-propagation.test-helpers";
import { CompassToGoogleEventPropagation } from "@backend/sync/services/event-propagation/compass-to-google/compass-to-google.event-propagation";

/**
 * Scope "this" applied to a standalone (non-recurring) event -- ported from
 * the deleted compass-to-google-this-event/regular.test.ts (18 tests) against
 * the new pipeline. Preserves the original scenarios; assertions now target
 * gcalService spies (calendarId, patch vs create, mapEventRecordToGoogle
 * body) instead of the removed CompassEvent/RecurringEventUpdateScope shapes.
 */
describe("CompassToGoogleEventPropagation - scope 'this' - standalone event", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  const createInput = (calendarId: string) => ({
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

  it("creates a Google event and persists the returned externalReference", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    const createSpy = jest.spyOn(gcalService, "createEvent");

    const created = await eventService.create(
      user._id.toString(),
      createInput(calendar._id.toHexString()),
    );

    expect(createSpy).toHaveBeenCalledTimes(1);
    const [, calendarIdArg, body] = createSpy.mock.calls[0]!;
    expect(calendarIdArg).toBe(calendar.source.calendarId);
    expect(body).toMatchObject({ summary: "Standup", description: "" });

    const persisted = await eventService.readById(
      user._id.toString(),
      created._id.toHexString(),
    );
    expect(persisted.externalReference).toMatchObject({
      provider: "google",
      eventId: expect.any(String),
    });
  });

  it("patches the Google event when a replace targets a record with an externalReference", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    const created = await eventService.create(
      user._id.toString(),
      createInput(calendar._id.toHexString()),
    );
    const patchSpy = jest.spyOn(gcalService, "patchEvent");
    const before = await eventService.readById(
      user._id.toString(),
      created._id.toHexString(),
    );
    expect(before.externalReference).not.toBeNull();

    await eventService.replace(user._id.toString(), created._id.toHexString(), {
      content: { kind: "details", title: "Standup (moved)", description: "" },
      schedule: createInput(calendar._id.toHexString()).schedule,
      recurrence: { kind: "preserve" },
      priority: "unassigned",
      scope: "this",
    });

    expect(patchSpy).toHaveBeenCalledTimes(1);
    const [, calendarIdArg, eventIdArg, body] = patchSpy.mock.calls[0]!;
    expect(calendarIdArg).toBe(calendar.source.calendarId);
    expect(eventIdArg).toBe(before.externalReference?.eventId);
    expect(body).toMatchObject({ summary: "Standup (moved)" });
  });

  it("deletes the Google event when a scope 'this' delete targets a record with an externalReference", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    const created = await eventService.create(
      user._id.toString(),
      createInput(calendar._id.toHexString()),
    );
    const before = await eventService.readById(
      user._id.toString(),
      created._id.toHexString(),
    );
    const deleteSpy = jest.spyOn(gcalService, "deleteEvent");

    await eventService.delete(user._id.toString(), created._id.toHexString(), {
      scope: "this",
    });

    expect(deleteSpy).toHaveBeenCalledTimes(1);
    const [, calendarIdArg, eventIdArg] = deleteSpy.mock.calls[0]!;
    expect(calendarIdArg).toBe(calendar.source.calendarId);
    expect(eventIdArg).toBe(before.externalReference?.eventId);
  });

  it("does not call Google to delete a record that was never synced (no externalReference)", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    const createSpy = jest
      .spyOn(gcalService, "createEvent")
      .mockImplementationOnce(async () => {
        throw new Error("simulated provider outage during create");
      });
    const deleteSpy = jest.spyOn(gcalService, "deleteEvent");

    // The create's Google effect fails, but the Mongo write already
    // committed (B7) -- the event exists locally with no externalReference.
    await expect(
      eventService.create(
        user._id.toString(),
        createInput(calendar._id.toHexString()),
      ),
    ).rejects.toMatchObject({ mutationCode: "PROVIDER_FAILURE" });
    createSpy.mockRestore();

    const [created] = await eventService.readAll(user._id.toString(), {
      kind: "range",
      start: "2026-07-14T00:00:00Z",
      end: "2026-07-15T00:00:00Z",
      priorities: [],
    });
    expect(created).toBeDefined();
    expect(created!.externalReference).toBeNull();

    await eventService.delete(user._id.toString(), created!._id.toHexString(), {
      scope: "this",
    });

    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it("does not call Google for events on a non-google (local) calendar", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedLocalCalendar(user._id);
    const createSpy = jest.spyOn(gcalService, "createEvent");
    const patchSpy = jest.spyOn(gcalService, "patchEvent");
    const deleteSpy = jest.spyOn(gcalService, "deleteEvent");

    const created = await eventService.create(
      user._id.toString(),
      createInput(calendar._id.toHexString()),
    );
    await eventService.replace(user._id.toString(), created._id.toHexString(), {
      content: { kind: "details", title: "Renamed", description: "" },
      schedule: createInput(calendar._id.toHexString()).schedule,
      recurrence: { kind: "preserve" },
      priority: "unassigned",
      scope: "this",
    });
    await eventService.delete(user._id.toString(), created._id.toHexString(), {
      scope: "this",
    });

    expect(createSpy).not.toHaveBeenCalled();
    expect(patchSpy).not.toHaveBeenCalled();
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it("does not call Google for a busy-content record (not writable)", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    const createSpy = jest.spyOn(gcalService, "createEvent");
    // Busy-content records are a reader-only privacy placeholder that never
    // originates from a create/replace input (EditableContentSchema only
    // allows "details"); they can still reach propagateUpsert via a
    // Google->Compass import upsert, so exercise the guard directly.
    const record = buildEventRecord(calendar._id, {
      content: { kind: "busy" },
    });

    await CompassToGoogleEventPropagation.propagate(user._id.toString(), {
      upserted: [record],
      deletedBefore: [],
    });

    expect(createSpy).not.toHaveBeenCalled();
  });

  it("swallows a missing-refresh-token failure: the Mongo write stands and no error is thrown", async () => {
    const { user } = await setupNoGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);

    const created = await eventService.create(
      user._id.toString(),
      createInput(calendar._id.toHexString()),
    );

    const persisted = await eventService.readById(
      user._id.toString(),
      created._id.toHexString(),
    );
    expect(persisted.externalReference).toBeNull();
  });
});
