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
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
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
    const propagation = new GoogleToCompassEventPropagation(gcal, calendar);

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
    const propagation = new GoogleToCompassEventPropagation(gcal, calendar);
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
    const propagation = new GoogleToCompassEventPropagation(gcal, calendar);
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
    const propagation = new GoogleToCompassEventPropagation(gcal, calendar);

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
    const propagation = new GoogleToCompassEventPropagation(gcal, calendar);
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
    const propagation = new GoogleToCompassEventPropagation(gcal, calendar);
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
    const propagation = new GoogleToCompassEventPropagation(gcal, calendar);
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
    const propagation = new GoogleToCompassEventPropagation(gcal, calendar);

    const result = await propagation.processEvents([gEvent]);

    expect(result.ignored).toBe(1);
    expect(result.saved).toBe(0);
  });
});
