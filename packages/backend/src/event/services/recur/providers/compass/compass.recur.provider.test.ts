import {
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";
import {
  cleanupTestMongo,
  clearCollections,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import {
  createMockBaseEvent,
  createMockInstance,
  createMockInstances,
} from "@backend/__tests__/mocks.gcal/factories/ccal.event.factory";
import mongoService from "@backend/common/services/mongo.service";
import { isBase, isInstance } from "../../util/recur.util";
import { CompassRecurringEventProvider } from "./compass.recur.provider";

describe("Compass Recurring Event Provider", () => {
  let provider: CompassRecurringEventProvider;
  let setup: Awaited<ReturnType<typeof setupTestDb>>;

  beforeAll(async () => {
    setup = await setupTestDb();
    provider = new CompassRecurringEventProvider(
      mongoService.event,
      setup.userId,
    );
  });

  beforeEach(async () => {
    await clearCollections(setup.db);
  });

  afterAll(async () => {
    await cleanupTestMongo(setup);
  });

  describe("CREATE: base event", () => {
    it("should insert a base event", async () => {
      // Setup base event
      const baseEvent = createMockBaseEvent({ user: setup.userId });

      // Execute
      const result = await provider.insertBaseEvent(baseEvent);

      // Verify
      expect(result.insertedId).toBeDefined();
      const storedEvents = await mongoService.event.find().toArray();
      expect(storedEvents).toHaveLength(1);
      expect(storedEvents[0]?._id).toBeDefined();
      expect(storedEvents[0]?.title).toBe(baseEvent.title);
    });
  });
  describe("CREATE: series", () => {
    it("should create a base event and its instances", async () => {
      // Setup base event
      const baseEvent = createMockBaseEvent({ user: setup.userId });

      // Execute
      await provider.createSeries(baseEvent, 5);

      // Verify database state
      const storedEvents = await mongoService.event.find().toArray();
      expect(storedEvents).toHaveLength(5); // Base + instances

      // Verify base event
      const storedBaseEvent = storedEvents.find((e) => isBase(e));
      expect(storedBaseEvent).toBeDefined();
      expect(storedBaseEvent?.title).toBe("Weekly Team Sync");
      expect(storedBaseEvent?.recurrence?.rule).toEqual(["RRULE:FREQ=WEEKLY"]);
      expect(storedBaseEvent?.startDate).toBe(baseEvent.startDate);

      // Verify instances
      const instances = storedEvents.filter((e) => isInstance(e));
      expect(instances).toHaveLength(4);
      expect(instances[0]?.startDate).toBe("2024-03-27T10:00:00.000Z");
      expect(instances[0]?.recurrence?.rule).toBeUndefined();
      expect(instances[1]?.startDate).toBe("2024-04-03T10:00:00.000Z");
      expect(instances[1]?.recurrence?.rule).toBeUndefined();
    }, 6000);
  });
  describe("CREATE: instances", () => {
    it("should insert multiple event instances", async () => {
      const baseEvent = createMockBaseEvent({ user: setup.userId });
      const instances = createMockInstances(baseEvent, 2, {
        user: setup.userId,
      });

      // Execute
      const result = await provider.insertEventInstances(instances);

      // Verify
      expect(result.insertedIds).toHaveLength(2);
      const storedEvents = await mongoService.event.find().toArray();
      expect(storedEvents).toHaveLength(2);
      expect(storedEvents.map((e) => e._id.toString())).toEqual(
        expect.arrayContaining(result.insertedIds),
      );
    });
  });
  describe("UPDATE: instance", () => {
    it("should update only the specified instance", async () => {
      // Setup base event and instance
      const baseEvent = createMockBaseEvent({ user: setup.userId });
      const instance = createMockInstance(baseEvent._id, {
        user: setup.userId,
      });

      // Add events to database
      await mongoService.event.insertOne(baseEvent);
      await mongoService.event.insertOne(instance);

      // Update instance
      const updatedInstance = {
        ...instance,
        title: "Updated Team Sync",
        description: "Meeting in Conference Room B",
      };

      // Execute
      await provider.updateInstance(updatedInstance);

      // Verify database state
      const storedEvents = await mongoService.event.find().toArray();

      // Check instance was updated
      const updatedStoredInstance = storedEvents.find(
        (e) => e._id === instance._id,
      );
      expect(updatedStoredInstance?.title).toBe("Updated Team Sync");
      expect(updatedStoredInstance?.description).toBe(
        "Meeting in Conference Room B",
      );

      // Check base event remains unchanged
      const unchangedBaseEvent = storedEvents.find(
        (e) => e._id === baseEvent._id,
      );
      expect(unchangedBaseEvent?.title).toBe("Weekly Team Sync");
    });
  });

  describe("UPDATE: expand recurring event", () => {
    it("should return all instances of a recurring event", async () => {
      // Setup base event and instances
      const baseEvent = createMockBaseEvent({ user: setup.userId });
      const instances = createMockInstances(baseEvent, 2, {
        user: setup.userId,
      });

      // Add events to database
      await mongoService.event.insertOne(baseEvent);
      await mongoService.event.insertMany(instances);

      // Execute
      const expandedEvents = await provider.expandInstances(baseEvent);

      // Verify
      expect(expandedEvents).toHaveLength(instances.length);
      expect(expandedEvents.map((e) => e._id)).toContain(instances[0]?._id);
      expect(expandedEvents.map((e) => e._id)).toContain(instances[1]?._id);
    });
  });

  describe("UPDATE: base event recurrence", () => {
    it("should update the recurrence rule of a base event", async () => {
      // Setup base event
      const baseEvent = createMockBaseEvent({ user: setup.userId });
      expect(baseEvent.recurrence?.rule).not.toEqual(["RRULE:FREQ=DAILY"]);

      // Add event to database
      await mongoService.event.insertOne(baseEvent);

      // Execute
      const result = await provider.updateBaseEventRecurrence(baseEvent._id, [
        "RRULE:FREQ=DAILY",
      ]);

      // Verify
      expect(result.matchedCount).toBe(1);
      const updatedEvent = await mongoService.event.findOne({
        _id: baseEvent._id,
      });
      expect(updatedEvent?.recurrence?.rule).toEqual(["RRULE:FREQ=DAILY"]);
    });
  });

  describe("UPDATE: series", () => {
    it("should update all events in a series", async () => {
      // Setup base event and instances
      const baseEvent = createMockBaseEvent({ user: setup.userId });
      const instances = createMockInstances(baseEvent, 2, {
        user: setup.userId,
      });

      // Add events to database
      await mongoService.event.insertOne(baseEvent);
      await mongoService.event.insertMany(instances);

      // Execute
      const updatedEvent: Schema_Event_Recur_Instance = {
        ...baseEvent,
        title: "Updated Team Sync",
        description: "Meeting in Conference Room B",
        recurrence: {
          eventId: baseEvent._id as string,
        },
      };

      const result = await provider.updateSeries(updatedEvent);

      // Verify
      expect(result.matchedCount).toBe(4); // Old base + new base + 2 instances
      const storedEvents = await mongoService.event.find().toArray();
      const oldBase = storedEvents[0];
      expect(oldBase?.title).toBe("Weekly Team Sync");

      const newBase = storedEvents[1];
      expect(newBase?.title).toBe("Updated Team Sync");

      const newInstances = storedEvents.slice(2);
      newInstances.forEach((event) => {
        expect(event.title).toBe("Updated Team Sync");
        expect(event.description).toBe("Meeting in Conference Room B");
      });
    });
  });

  describe("UPDATE: series with split", () => {
    it("should preserve the instances up to the split and create new instances for the remaining events", async () => {
      // Setup original base event and instance
      const originalBase = createMockBaseEvent({ user: setup.userId });
      const originalBaseId = originalBase._id as string;
      const instance1 = createMockInstance(originalBaseId, {
        user: setup.userId,
        startDate: "2024-04-03T10:00:00.000Z",
        endDate: "2024-04-03T11:00:00.000Z",
      });
      const instance2 = createMockInstance(originalBaseId, {
        user: setup.userId,
        startDate: "2024-04-10T10:00:00.000Z",
        endDate: "2024-04-10T11:00:00.000Z",
      });
      const instance3Modified = createMockInstance(originalBaseId, {
        user: setup.userId,
        startDate: "2024-04-17T10:00:00.000Z",
        endDate: "2024-04-17T11:00:00.000Z",
      });
      const instance4 = createMockInstance(originalBaseId, {
        user: setup.userId,
        startDate: "2024-04-24T10:00:00.000Z",
        endDate: "2024-04-24T11:00:00.000Z",
      });
      const instance5 = createMockInstance(originalBaseId, {
        user: setup.userId,
        startDate: "2024-05-01T10:00:00.000Z",
        endDate: "2024-05-01T11:00:00.000Z",
      });
      const instance6 = createMockInstance(originalBaseId, {
        user: setup.userId,
        startDate: "2024-05-08T10:00:00.000Z",
        endDate: "2024-05-08T11:00:00.000Z",
      });

      // Add events to database
      await mongoService.event.insertMany([
        originalBase,
        instance1,
        instance2,
        instance3Modified, // <--- this is the instance that will be split
        instance4,
        instance5,
        instance6,
      ]);

      // Setup new base event and modified instance
      const modifiedInstance: Schema_Event_Recur_Instance = {
        ...instance3Modified,
        title: "Team Sync - Updated", //<-- user changed title of this instance and applied to following
        recurrence: {
          eventId: originalBaseId,
        },
      };
      const newBase = createMockBaseEvent({
        user: setup.userId,
        title: "Team Sync - Updated",
      });

      // Execute
      await provider.updateSeriesWithSplit(
        originalBase,
        newBase,
        modifiedInstance,
      );

      // Verify
      const storedEvents = await mongoService.event.find().toArray();
      expect(storedEvents).toHaveLength(7); // 1 original base + 2 instances with origial base + 1 new base + 3 instances with new base

      // Check original base event was updated
      const updatedOriginalBase = storedEvents.find(
        (e) => e.title === "Weekly Team Sync",
      );
      const BASE2_START = "20240417T100000Z";
      expect(updatedOriginalBase?.recurrence?.rule).toEqual([
        `RRULE:FREQ=WEEKLY;UNTIL=${BASE2_START}`,
      ]);

      // Check new base event was created from modified instance
      const createdNewBase = storedEvents.find(
        (e) => isBase(e) && e.title === "Team Sync - Updated",
      ) as Schema_Event_Recur_Base;
      expect(createdNewBase).toBeDefined();
      expect(createdNewBase?.title).toBe("Team Sync - Updated");
      expect(createdNewBase?.recurrence?.rule).toEqual(["RRULE:FREQ=WEEKLY"]);
      expect(createdNewBase?._id).toBe(instance3Modified._id);

      // Check remaining instances were preserved
      const instancesBeforeSplit = storedEvents.filter(
        (e) => e.recurrence?.eventId === originalBaseId,
      );
      expect(instancesBeforeSplit).toHaveLength(2);
      instancesBeforeSplit.forEach((instance) => {
        expect(instance.title).toBe("Weekly Team Sync");
      });

      const instancesAfterSplit = storedEvents.filter(
        (e) => e.recurrence?.eventId === createdNewBase._id,
      );
      expect(instancesAfterSplit).toHaveLength(3);
      instancesAfterSplit.forEach((instance) => {
        expect(instance.title).toBe("Team Sync - Updated");
      });
    });
  });

  describe("UPDATE: entire series", () => {
    it("should update all events in a series with new data", async () => {
      // Setup base event and instances
      const originalBase = createMockBaseEvent({ user: setup.userId });
      const instances = createMockInstances(originalBase, 2, {
        user: setup.userId,
      });

      // Add events to database
      await mongoService.event.insertOne(originalBase);
      await mongoService.event.insertMany(instances);

      // Setup updated base event
      const updatedBase = createMockBaseEvent({
        user: setup.userId,
        title: "Updated Team Sync",
        description: "Meeting in Conference Room B",
      });

      // Execute
      const result = await provider.updateEntireSeries(
        originalBase,
        updatedBase,
      );

      // Verify
      expect(result.matchedCount).toBe(3); // Base event + 2 instances
      const storedEvents = await mongoService.event.find().toArray();
      storedEvents.forEach((event) => {
        expect(event.title).toBe("Updated Team Sync");
        expect(event.description).toBe("Meeting in Conference Room B");
      });
    });
  });
  describe("DELETE: instance", () => {
    it("should delete only the specified instance", async () => {
      // Setup base event and instance
      const baseEvent = createMockBaseEvent({ user: setup.userId });
      const instance = createMockInstance(baseEvent._id, {
        user: setup.userId,
      });

      // Add events to database
      await mongoService.event.insertOne(baseEvent);
      await mongoService.event.insertOne(instance);

      // Execute
      await provider.deleteInstance(instance._id);

      // Check instance was deleted
      const storedEvents = await mongoService.event.find().toArray();
      const deletedInstance = storedEvents.find((e) => e._id === instance._id);
      expect(deletedInstance).toBeUndefined();

      // Check base event remains
      const baseEventStillExists = storedEvents.find(
        (e) => e._id === baseEvent._id,
      );
      expect(baseEventStillExists).toBeDefined();
    });
  });

  describe("DELETE: series", () => {
    it("should delete the base event and all instances", async () => {
      // Setup base event and instance
      const baseEvent = createMockBaseEvent({ user: setup.userId });
      const instance = createMockInstance(baseEvent._id, {
        user: setup.userId,
      });

      // Add events to database
      await mongoService.event.insertOne(baseEvent);
      await mongoService.event.insertOne(instance);

      // Execute
      await provider.deleteSeries(baseEvent);

      // Verify database state
      const storedEvents = await mongoService.event.find().toArray();
      expect(storedEvents).toHaveLength(0);
    });
  });

  describe("DELETE: all instances", () => {
    it("should delete all instances of a recurring event", async () => {
      // Setup base event and instances
      const baseEvent = createMockBaseEvent({ user: setup.userId });
      const instances = createMockInstances(baseEvent, 2, {
        user: setup.userId,
      });

      // Add events to database
      await mongoService.event.insertOne(baseEvent);
      await mongoService.event.insertMany(instances);

      // Execute
      const result = await provider.deleteAllInstances(baseEvent._id);

      // Verify
      expect(result.deletedCount).toBe(2); // 2 instances
      const storedEvents = await mongoService.event.find().toArray();
      expect(storedEvents).toHaveLength(1);
      expect(storedEvents[0]?._id).toBe(baseEvent._id);
    });
  });

  describe("DELETE: instances from date", () => {
    it("should delete all instances from a given date", async () => {
      // Setup base event and instances
      const baseEvent = createMockBaseEvent({ user: setup.userId });
      const instances = createMockInstances(baseEvent, 2, {
        user: setup.userId,
      });

      // Add events to database
      await mongoService.event.insertOne(baseEvent);
      await mongoService.event.insertMany(instances);

      // Execute
      const result = await provider.deleteInstancesFromDate(
        baseEvent,
        "2024-04-01T00:00:00Z",
      );

      // Verify
      expect(result.deletedCount).toBe(1); // Only second instance should be deleted
      const storedEvents = await mongoService.event.find().toArray();
      expect(storedEvents).toHaveLength(2);
      expect(storedEvents.map((e) => e._id)).toContain(baseEvent._id);
      expect(storedEvents.map((e) => e._id)).toContain(instances[0]?._id);
    });
  });
});
