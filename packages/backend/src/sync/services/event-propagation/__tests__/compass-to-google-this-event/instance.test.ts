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
 * Scope "this" applied to a single series occurrence -- ported from the
 * deleted compass-to-google-this-event/instance.test.ts (9 tests).
 *
 * INTENT-IMPOSSIBLE (documented, not softened): the old pipeline pushed a
 * per-instance edit to Google as a patch against that occurrence's own
 * gEventId, which it obtained because Google itself expands a recurring
 * base into per-instance events server-side and the old sync flow persisted
 * each instance's Google-assigned id back onto the Compass instance
 * document during the base's initial sync.
 *
 * The new pipeline's propagateUpsert has no equivalent: materialized
 * instances (recurrence.kind === "occurrence") are intentionally excluded
 * from isWritableToGoogle (see base.test.ts) because nothing in this packet
 * resolves an occurrence's Google-side instance id -- there is no
 * events.instances() lookup, and creating a *new*, unlinked Google event per
 * occurrence would be worse than doing nothing (see the base.test.ts bug
 * writeup). Per-occurrence Google sync (exception events) is out of scope
 * for packet 03 (B7 + the "out of scope" list do not mention it) and is left
 * as a follow-up. These tests assert the current, deliberate no-op so a
 * future packet that adds real instance-level sync will have to touch this
 * file instead of silently regressing past it.
 */
describe("CompassToGoogleEventPropagation - scope 'this' - series occurrence (intent-impossible)", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  const seedSeries = async (userId: string, calendarId: string) => {
    const created = await eventService.create(userId, {
      calendarId: calendarId as never,
      content: { kind: "details", title: "Weekly sync", description: "" },
      schedule: {
        kind: "timed",
        start: "2026-07-14T15:00:00-06:00",
        end: "2026-07-14T16:00:00-06:00",
        timeZone: "America/Denver" as never,
      },
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=5"] },
      priority: "unassigned",
    });
    const instances = await mongoService.event
      .find({ "recurrence.seriesId": created._id })
      .sort({ "schedule.start": 1 })
      .toArray();
    return { base: created, instances };
  };

  it("does not call Google when a single occurrence is edited with scope 'this'", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    const { instances } = await seedSeries(
      user._id.toString(),
      calendar._id.toHexString(),
    );
    const target = instances[0]!;

    const createSpy = jest.spyOn(gcalService, "createEvent");
    const patchSpy = jest.spyOn(gcalService, "patchEvent");

    const updated = await eventService.replace(
      user._id.toString(),
      target._id.toHexString(),
      {
        content: {
          kind: "details",
          title: "Weekly sync (one-off)",
          description: "",
        },
        schedule: {
          kind: "timed",
          start: "2026-07-21T15:00:00-06:00",
          end: "2026-07-21T16:00:00-06:00",
          timeZone: "America/Denver" as never,
        },
        recurrence: { kind: "preserve" },
        priority: "unassigned",
        scope: "this",
      },
    );

    expect(updated.recurrence.kind).toBe("occurrence");
    expect(updated.externalReference).toBeNull();
    expect(createSpy).not.toHaveBeenCalled();
    expect(patchSpy).not.toHaveBeenCalled();
  });

  it("does not call Google when a single occurrence is deleted with scope 'this'", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    const { instances } = await seedSeries(
      user._id.toString(),
      calendar._id.toHexString(),
    );
    const target = instances[0]!;
    const deleteSpy = jest.spyOn(gcalService, "deleteEvent");

    await eventService.delete(user._id.toString(), target._id.toHexString(), {
      scope: "this",
    });

    expect(deleteSpy).not.toHaveBeenCalled();
    await expect(
      eventService.readById(user._id.toString(), target._id.toHexString()),
    ).rejects.toMatchObject({ mutationCode: "EVENT_NOT_FOUND" });
  });

  it("rejects editing the series base itself with scope 'this' (RECURRENCE_CONFLICT, B6)", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    const { base } = await seedSeries(
      user._id.toString(),
      calendar._id.toHexString(),
    );

    await expect(
      eventService.replace(user._id.toString(), base._id.toHexString(), {
        content: { kind: "details", title: "Nope", description: "" },
        schedule: {
          kind: "timed",
          start: "2026-07-14T15:00:00-06:00",
          end: "2026-07-14T16:00:00-06:00",
          timeZone: "America/Denver" as never,
        },
        recurrence: { kind: "preserve" },
        priority: "unassigned",
        scope: "this",
      }),
    ).rejects.toMatchObject({ mutationCode: "RECURRENCE_CONFLICT" });
  });
});
