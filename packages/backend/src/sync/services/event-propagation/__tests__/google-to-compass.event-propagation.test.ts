import { ObjectId } from "mongodb";
import { type gCalendar, type gSchema$Event } from "@core/types/gcal";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import {
  mockRecurringGcalEvents,
  mockRegularGcalEvent,
} from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import { type GoogleRequestContext } from "@backend/common/services/gcal/gcal.context";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { mapGoogleEvent } from "@backend/event/google-event.adapter";
import { GoogleToCompassEventPropagation } from "@backend/sync/services/event-propagation/google-to-compass/google-to-compass.event-propagation";

jest.mock("@backend/common/services/gcal/gcal.service", () => ({
  __esModule: true,
  default: {
    getBaseRecurringEventInstances: jest.fn(),
  },
}));

const asAsyncPage = async function* (items: gSchema$Event[]) {
  yield { items };
};

/**
 * These tests supersede the old FSM-based GcalEventParser suite
 * (google-to-compass.upsert.*.test.ts / google-to-compass.delete.test.ts,
 * removed in this cutover): matching is now purely by (calendarId,
 * externalReference.eventId) (B8), so every prior "transition" (standalone
 * -> series, series -> standalone, series split, instance cancel, series
 * cancel) collapses into an upsert or delete against that pair instead of a
 * bespoke state machine. The scenarios below preserve the same behavioral
 * intent under the new model.
 */
describe("GoogleToCompassEventPropagation", () => {
  let calendar: CalendarRecord;
  const gcal = {} as gCalendar;
  const context: GoogleRequestContext = { gcal, quotaUser: "user-1" };

  beforeAll(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  beforeEach(async () => {
    calendar = {
      _id: new ObjectId(),
      userId: new ObjectId(),
      name: "Primary",
      description: "",
      timeZone: "America/Denver",
      foregroundColor: "#000000",
      backgroundColor: "#ffffff",
      access: "owner",
      isPrimary: true,
      isVisible: true,
      isActive: true,
      source: { provider: "google", calendarId: "primary", etag: "etag-1" },
      createdAt: new Date(),
      updatedAt: null,
    };
    await mongoService.calendar.insertOne(calendar);
    (gcalService.getBaseRecurringEventInstances as jest.Mock).mockReset();
  });

  it("creates a standalone event", async () => {
    const gEvent = mockRegularGcalEvent();
    const propagation = new GoogleToCompassEventPropagation(context, calendar);

    const result = await propagation.processEvents([gEvent]);

    expect(result.saved).toBe(1);
    const stored = await mongoService.event.findOne({
      "externalReference.eventId": gEvent.id,
    });
    expect(stored?.content).toEqual({
      kind: "details",
      title: gEvent.summary,
      description: gEvent.description ?? "",
    });
  });

  it("updates the matching event by (calendarId, externalReference.eventId)", async () => {
    const gEvent = mockRegularGcalEvent();
    const propagation = new GoogleToCompassEventPropagation(context, calendar);
    await propagation.processEvents([gEvent]);

    const result = await propagation.processEvents([
      { ...gEvent, summary: "Updated title" },
    ]);

    expect(result.saved).toBe(1);
    const all = await mongoService.event
      .find({ "externalReference.eventId": gEvent.id })
      .toArray();
    expect(all).toHaveLength(1);
    expect(all[0]?.content).toEqual(
      expect.objectContaining({ title: "Updated title" }),
    );
  });

  it("deletes the matching event when Google reports it cancelled", async () => {
    const gEvent = mockRegularGcalEvent();
    const propagation = new GoogleToCompassEventPropagation(context, calendar);
    await propagation.processEvents([gEvent]);

    const result = await propagation.processEvents([
      { ...gEvent, status: "cancelled" },
    ]);

    expect(result.deleted).toBe(1);
    expect(
      await mongoService.event.findOne({
        "externalReference.eventId": gEvent.id,
      }),
    ).toBeNull();
  });

  it("creates a series base and materializes its instances", async () => {
    const { base, instances } = mockRecurringGcalEvents();
    (gcalService.getBaseRecurringEventInstances as jest.Mock).mockReturnValue(
      asAsyncPage(instances),
    );
    const propagation = new GoogleToCompassEventPropagation(context, calendar);

    const result = await propagation.processEvents([base]);

    expect(result.saved).toBe(1 + instances.length);
    const baseRecord = await mongoService.event.findOne({
      "externalReference.eventId": base.id,
    });
    expect(baseRecord?.recurrence).toEqual({
      kind: "series",
      rules: base.recurrence,
    });

    const instanceRecords = await mongoService.event
      .find({ "recurrence.kind": "occurrence" })
      .toArray();
    expect(instanceRecords).toHaveLength(instances.length);
    expect(
      instanceRecords.every(
        (r) =>
          r.recurrence.kind === "occurrence" &&
          r.recurrence.seriesId.equals(baseRecord!._id),
      ),
    ).toBe(true);
  });

  it("deletes the base and every instance when the whole series is cancelled", async () => {
    const { base, instances } = mockRecurringGcalEvents();
    (gcalService.getBaseRecurringEventInstances as jest.Mock).mockReturnValue(
      asAsyncPage(instances),
    );
    const propagation = new GoogleToCompassEventPropagation(context, calendar);
    await propagation.processEvents([base]);

    const cancellations = [
      { ...base, status: "cancelled" },
      ...instances.map((instance) => ({ ...instance, status: "cancelled" })),
    ];
    const result = await propagation.processEvents(cancellations);

    expect(result.deleted).toBe(1 + instances.length);
    expect(await mongoService.event.countDocuments({})).toBe(0);
  });

  it("deletes only the matching occurrence when a single instance is cancelled", async () => {
    const { base, instances } = mockRecurringGcalEvents();
    (gcalService.getBaseRecurringEventInstances as jest.Mock).mockReturnValue(
      asAsyncPage(instances),
    );
    const propagation = new GoogleToCompassEventPropagation(context, calendar);
    await propagation.processEvents([base]);

    const [firstInstance] = instances;
    const result = await propagation.processEvents([
      { ...firstInstance, status: "cancelled" },
    ]);

    expect(result.deleted).toBe(1);
    const remaining = await mongoService.event
      .find({ "recurrence.kind": "occurrence" })
      .toArray();
    expect(remaining).toHaveLength(instances.length - 1);
  });

  it("creates an independent series when Google splits one via a new base id ('this and following')", async () => {
    const { base, instances } = mockRecurringGcalEvents();
    (
      gcalService.getBaseRecurringEventInstances as jest.Mock
    ).mockReturnValueOnce(asAsyncPage(instances));
    const propagation = new GoogleToCompassEventPropagation(context, calendar);
    await propagation.processEvents([base]);

    const { base: splitBase, instances: splitInstances } =
      mockRecurringGcalEvents();
    (
      gcalService.getBaseRecurringEventInstances as jest.Mock
    ).mockReturnValueOnce(asAsyncPage(splitInstances));
    await propagation.processEvents([splitBase]);

    const bases = await mongoService.event
      .find({ "recurrence.kind": "series" })
      .toArray();
    expect(bases).toHaveLength(2);
  });

  it("ignores unsupported event types without dropping them silently", async () => {
    const gEvent = mockRegularGcalEvent({ eventType: "outOfOffice" });
    const propagation = new GoogleToCompassEventPropagation(context, calendar);

    const result = await propagation.processEvents([gEvent]);

    expect(result.ignored).toBe(1);
    expect(result.saved).toBe(0);
  });

  /**
   * Packet 06 test-matrix item: a user moving an event between two of their
   * own Google calendars delivers as an upsert on the target calendar and a
   * cancellation on the source calendar, in either order (Google doesn't
   * guarantee delivery order across two distinct watches). Convergence to
   * exactly one copy, owned by the target, relies on deleteByExternalReference
   * being scoped to `this.calendar._id` (google-event-sync.service.ts) - a
   * cancellation on cal-src can never delete cal-tgt's copy of the same
   * provider event id, regardless of delivery order.
   */
  describe("cross-calendar move convergence", () => {
    // Both calendars belong to the same user - a move happens within one
    // account's calendar set.
    const moveUserId = new ObjectId();
    const buildTestCalendar = (
      gCalendarId: string,
      overrides: Partial<CalendarRecord> = {},
    ): CalendarRecord => ({
      _id: new ObjectId(),
      userId: moveUserId,
      name: gCalendarId,
      description: "",
      timeZone: "America/Denver",
      foregroundColor: "#000000",
      backgroundColor: "#ffffff",
      access: "owner",
      isPrimary: false,
      isVisible: true,
      isActive: true,
      source: { provider: "google", calendarId: gCalendarId, etag: "etag-1" },
      createdAt: new Date(),
      updatedAt: null,
      ...overrides,
    });

    it("converges to one event owned by the target when the target upsert arrives before the source cancellation", async () => {
      const calSrc = buildTestCalendar("cal-src");
      const calTgt = buildTestCalendar("cal-tgt");
      await mongoService.calendar.insertMany([calSrc, calTgt]);

      const gEvent = mockRegularGcalEvent({ id: "evt-1" });
      const srcPropagation = new GoogleToCompassEventPropagation(
        context,
        calSrc,
      );
      await srcPropagation.processEvents([gEvent]);

      // Order A: target upsert, then source cancellation.
      const tgtPropagation = new GoogleToCompassEventPropagation(
        context,
        calTgt,
      );
      await tgtPropagation.processEvents([gEvent]);
      await srcPropagation.processEvents([{ ...gEvent, status: "cancelled" }]);

      const matching = await mongoService.event
        .find({ "externalReference.eventId": "evt-1" })
        .toArray();
      expect(matching).toHaveLength(1);
      expect(matching[0]?.calendarId).toEqual(calTgt._id);
      expect(
        await mongoService.event.countDocuments({ calendarId: calSrc._id }),
      ).toBe(0);
    });

    it("converges to one event owned by the target when the source cancellation arrives before the target upsert", async () => {
      const calSrc = buildTestCalendar("cal-src");
      const calTgt = buildTestCalendar("cal-tgt");
      await mongoService.calendar.insertMany([calSrc, calTgt]);

      const gEvent = mockRegularGcalEvent({ id: "evt-1" });
      const srcPropagation = new GoogleToCompassEventPropagation(
        context,
        calSrc,
      );
      await srcPropagation.processEvents([gEvent]);

      // Order B: source cancellation, then target upsert.
      await srcPropagation.processEvents([{ ...gEvent, status: "cancelled" }]);
      const tgtPropagation = new GoogleToCompassEventPropagation(
        context,
        calTgt,
      );
      await tgtPropagation.processEvents([gEvent]);

      const matching = await mongoService.event
        .find({ "externalReference.eventId": "evt-1" })
        .toArray();
      expect(matching).toHaveLength(1);
      expect(matching[0]?.calendarId).toEqual(calTgt._id);
      expect(
        await mongoService.event.countDocuments({ calendarId: calSrc._id }),
      ).toBe(0);
    });
  });

  /**
   * A Compass-created series materializes every occurrence locally
   * (including the first, B6) before any of them have ever synced to
   * Google -- Compass->Google propagation only pushes the base. The
   * webhook echo of that base's own creation must adopt those existing
   * unlinked occurrences instead of inserting Google's copies alongside
   * them.
   */
  describe("Compass-created series echo convergence", () => {
    const seedLinkedBase = async (gBase: gSchema$Event) => {
      const mapped = mapGoogleEvent(gBase, {
        calendarId: calendar._id,
        calendarTimeZone: calendar.timeZone,
        resolveSeriesObjectId: () => undefined,
        now: new Date(),
      });
      if (mapped.kind !== "mapped") throw new Error("expected mapped base");
      await mongoService.event.insertOne(mapped.event);
      return mapped.event;
    };

    const seedUnlinkedOccurrence = async (
      gInstance: gSchema$Event,
      seriesId: ObjectId,
    ) => {
      const mapped = mapGoogleEvent(gInstance, {
        calendarId: calendar._id,
        calendarTimeZone: calendar.timeZone,
        resolveSeriesObjectId: () => seriesId,
        now: new Date(),
      });
      if (mapped.kind !== "mapped")
        throw new Error("expected mapped instance");
      const unlinked = {
        ...mapped.event,
        _id: new ObjectId(),
        externalReference: null,
      };
      await mongoService.event.insertOne(unlinked);
      return unlinked;
    };

    it("adopts every locally materialized occurrence (including the first) instead of duplicating it", async () => {
      const { base: gBase, instances: gInstances } = mockRecurringGcalEvents();
      const base = await seedLinkedBase(gBase);
      const seeded = [];
      for (const gInstance of gInstances) {
        seeded.push(await seedUnlinkedOccurrence(gInstance, base._id));
      }

      (
        gcalService.getBaseRecurringEventInstances as jest.Mock
      ).mockReturnValue(asAsyncPage(gInstances));
      const propagation = new GoogleToCompassEventPropagation(
        context,
        calendar,
      );
      const result = await propagation.processEvents([gBase]);

      expect(result.saved).toBe(1 + gInstances.length);

      const occurrenceRecords = await mongoService.event
        .find({ "recurrence.kind": "occurrence" })
        .toArray();
      expect(occurrenceRecords).toHaveLength(gInstances.length);
      expect(
        occurrenceRecords.every((r) => r.externalReference !== null),
      ).toBe(true);

      const adoptedIds = new Set(
        occurrenceRecords.map((r) => r._id.toHexString()),
      );
      seeded.forEach((s) => {
        expect(adoptedIds.has(s._id.toHexString())).toBe(true);
      });
    });

    it("deletes an unlinked occurrence via series + original position when Google cancels an instance that never synced", async () => {
      const { base: gBase, instances: gInstances } = mockRecurringGcalEvents();
      const [firstGInstance] = gInstances;
      if (!firstGInstance) throw new Error("expected at least one instance");

      const base = await seedLinkedBase(gBase);
      const unlinked = await seedUnlinkedOccurrence(firstGInstance, base._id);

      const cancellation = {
        ...firstGInstance,
        status: "cancelled" as const,
        originalStartTime: firstGInstance.start,
      };

      const propagation = new GoogleToCompassEventPropagation(
        context,
        calendar,
      );
      const result = await propagation.processEvents([cancellation]);

      expect(result.deleted).toBe(1);
      expect(
        await mongoService.event.findOne({ _id: unlinked._id }),
      ).toBeNull();
    });
  });
});
