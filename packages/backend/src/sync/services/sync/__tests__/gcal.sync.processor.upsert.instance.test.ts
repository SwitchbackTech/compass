import { Categories_Recurrence } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { simulateDbAfterGcalImport } from "@backend/__tests__/helpers/mock.events.init";
import mongoService from "@backend/common/services/mongo.service";
import { GcalSyncProcessor } from "@backend/sync/services/sync/gcal.sync.processor";

describe("GcalSyncProcessor UPSERT: INSTANCE", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("should handle UPDATING a TIMED INSTANCE", async () => {
    /* Assemble */
    const { user } = await UtilDriver.setupTestUser();

    const { gcalEvents } = await simulateDbAfterGcalImport(user._id.toString());

    // Simulate a change to the instance in GCal
    const origInstance = gcalEvents.instances[1];
    const origTitle = origInstance?.summary;

    const instance = {
      ...origInstance,
      summary: origTitle + " - Changed in GCal",
    };

    const instanceTitle = instance.summary;

    const processor = new GcalSyncProcessor(user._id.toString());
    const changes = await processor.processEvents([instance]);

    // Verify the correct change was detected
    expect(changes).toHaveLength(1);

    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: instanceTitle,
          category: Categories_Recurrence.RECURRENCE_INSTANCE,
          operation: "RECURRENCE_INSTANCE_UPDATED",
        }),
      ]),
    );

    // Verify no other events were deleted
    const updatedInstance = await mongoService.event.findOne({
      gEventId: instance.id,
      user: user._id.toString(),
    });

    // Verify the instance was updated
    expect(updatedInstance).toBeDefined();
    expect(updatedInstance?.title).toEqual(instanceTitle);
  });

  it("should handle DETACHING an INSTANCE into a STANDALONE event", async () => {
    const { user } = await UtilDriver.setupTestUser();

    const { gcalEvents } = await simulateDbAfterGcalImport(user._id.toString());

    const origInstance = gcalEvents.instances[0];

    const standalone = {
      ...origInstance,
      summary: "Detached Instance Event",
    } as gSchema$Event;

    delete (standalone as { recurringEventId?: string }).recurringEventId;
    delete (standalone as { recurrence?: string[] }).recurrence;

    const processor = new GcalSyncProcessor(user._id.toString());
    const changes = await processor.processEvents([standalone]);

    expect(changes).toHaveLength(1);
    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: standalone.summary,
          category: Categories_Recurrence.RECURRENCE_INSTANCE,
          transition: ["RECURRENCE_INSTANCE", "STANDALONE_CONFIRMED"],
          operation: "RECURRENCE_INSTANCE_UPDATED",
        }),
      ]),
    );

    const updatedStandalone = await mongoService.event.findOne({
      gEventId: standalone.id!,
      user: user._id.toString(),
    });

    expect(updatedStandalone).toBeDefined();
    expect(updatedStandalone?.gRecurringEventId).toBeUndefined();
    expect(updatedStandalone?.recurrence).toBeUndefined();
  });

  it("should handle UPDATING a REGULAR, BASE and TIMED INSTANCE", async () => {
    const { user } = await UtilDriver.setupTestUser();

    const { gcalEvents } = await simulateDbAfterGcalImport(user._id.toString());

    const regular = { ...gcalEvents.regular, summary: "Updated Regular Event" };

    const instance = {
      ...gcalEvents.instances[0],
      summary: "Updated Recurring Instance Event",
    };

    const base = { ...gcalEvents.recurring, summary: "Updated Base Event" };

    const updatedGcalEvents = [regular, base, instance];

    const processor = new GcalSyncProcessor(user._id.toString());
    const changes = await processor.processEvents(updatedGcalEvents);

    expect(changes).toHaveLength(4);

    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: regular.summary,
          category: Categories_Recurrence.STANDALONE,
          transition: ["STANDALONE", "STANDALONE_CONFIRMED"],
          operation: "STANDALONE_UPDATED",
        }),
        expect.objectContaining({
          title: base.summary,
          category: Categories_Recurrence.RECURRENCE_BASE,
          transition: ["RECURRENCE_BASE", "RECURRENCE_BASE_CONFIRMED"],
          operation: "RECURRENCE_BASE_UPDATED",
        }),
        expect.objectContaining({
          title: base.summary,
          category: Categories_Recurrence.RECURRENCE_BASE,
          transition: ["RECURRENCE_BASE", "RECURRENCE_BASE_CONFIRMED"],
          operation: "TIMED_INSTANCES_UPDATED",
        }),
        expect.objectContaining({
          title: instance.summary,
          category: Categories_Recurrence.RECURRENCE_INSTANCE,
          transition: ["RECURRENCE_INSTANCE", "RECURRENCE_INSTANCE_CONFIRMED"],
          operation: "RECURRENCE_INSTANCE_UPDATED",
        }),
      ]),
    );

    // Verify no other events were updated
    const [
      updatedRegular,
      updatedBase,
      updatedInstance,
      filteredUpdatedInstances,
    ] = await Promise.all([
      mongoService.event.findOne({
        gEventId: regular.id!,
        user: user._id.toString(),
      }),
      mongoService.event.findOne({
        gEventId: base.id!,
        user: user._id.toString(),
      }),
      mongoService.event.findOne({
        gEventId: instance.id!,
        user: user._id.toString(),
      }),
      mongoService.event
        .find({
          gRecurringEventId: base.id!,
          user: user._id.toString(),
          gEventId: { $ne: instance.id! },
        })
        .toArray(),
    ]);

    // Verify the instance was updated
    expect(updatedRegular).toBeDefined();
    expect(updatedBase).toBeDefined();
    expect(updatedInstance).toBeDefined();
    expect(filteredUpdatedInstances.length).toBeGreaterThan(0);

    expect(updatedRegular?.title).toEqual(regular.summary);
    expect(updatedBase?.title).toEqual(base.summary);
    expect(updatedInstance?.title).toEqual(instance.summary);

    filteredUpdatedInstances.forEach((inst) => {
      expect(inst.title).toEqual(base.summary);
    });
  });
});
