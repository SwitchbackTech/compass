import { ObjectId } from "mongodb";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import {
  cleanupTestMongo,
  clearCollections,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import { isInstance } from "../../util/recur.util";
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

  describe("Creating a recurring series", () => {
    it("should create a base event and its instances", async () => {
      // Setup base event
      const baseEvent: Schema_Event = {
        _id: new ObjectId().toString(),
        gEventId: "base-g-event-id",
        title: "Weekly Team Sync",
        description: "Weekly team meeting",
        startDate: "2024-03-20T10:00:00Z",
        endDate: "2024-03-20T11:00:00Z",
        recurrence: {
          rule: ["RRULE:FREQ=WEEKLY"],
          eventId: "base-g-event-id",
        },
        user: setup.userId,
        origin: Origin.GOOGLE,
        priority: Priorities.WORK,
        isAllDay: false,
        isSomeday: false,
        updatedAt: new Date(),
      };

      // Execute
      await provider.createSeries(baseEvent);

      // Verify database state
      const storedEvents = await mongoService.event.find().toArray();
      expect(storedEvents).toHaveLength(100); // Base + instances

      // Verify base event
      const storedBaseEvent = storedEvents.find(
        (e) => e.gEventId === "base-g-event-id",
      );
      expect(storedBaseEvent).toBeDefined();
      expect(storedBaseEvent?.title).toBe("Weekly Team Sync");
      expect(storedBaseEvent?.recurrence?.rule).toEqual(["RRULE:FREQ=WEEKLY"]);
      expect(storedBaseEvent?.startDate).toBe(baseEvent.startDate);

      // Verify instances
      const instances = storedEvents.filter((e) => isInstance(e));
      expect(instances).toHaveLength(99);
      if (instances[0] && instances[1]) {
        expect(instances[0].startDate).toBe("2024-03-27T10:00:00.000Z");
        expect(instances[0].recurrence?.rule).toHaveLength(0);
        expect(instances[1].startDate).toBe("2024-04-03T10:00:00.000Z");
        expect(instances[1].recurrence?.rule).toHaveLength(0);
      }
    });
  });

  describe("Updating a single instance", () => {
    it("should update only the specified instance", async () => {
      // Setup base event and instances
      const baseEvent: Schema_Event = {
        _id: new ObjectId().toString(),
        gEventId: "base-g-event-id",
        title: "Weekly Team Sync",
        startDate: "2024-03-20T10:00:00Z",
        endDate: "2024-03-20T11:00:00Z",
        recurrence: {
          rule: ["RRULE:FREQ=WEEKLY"],
          eventId: "base-g-event-id",
        },
        user: setup.userId,
        origin: Origin.GOOGLE,
        priority: Priorities.WORK,
        isAllDay: false,
        isSomeday: false,
        updatedAt: new Date(),
      };

      const instance: Schema_Event = {
        _id: new ObjectId().toString(),
        gEventId: "instance-1-g-id",
        title: "Weekly Team Sync",
        startDate: "2024-03-27T10:00:00Z",
        endDate: "2024-03-27T11:00:00Z",
        recurrence: {
          rule: [],
          eventId: "base-g-event-id",
        },
        user: setup.userId,
        origin: Origin.GOOGLE,
        priority: Priorities.WORK,
        isAllDay: false,
        isSomeday: false,
        updatedAt: new Date(),
      };

      // Add events to database
      await mongoService.event.insertOne(baseEvent);
      await mongoService.event.insertOne(instance);

      // Update instance
      const updatedInstance: Schema_Event = {
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
        (e) => e.gEventId === "instance-1-g-id",
      );
      expect(updatedStoredInstance?.title).toBe("Updated Team Sync");
      expect(updatedStoredInstance?.description).toBe(
        "Meeting in Conference Room B",
      );

      // Check base event remains unchanged
      const unchangedBaseEvent = storedEvents.find(
        (e) => e.gEventId === "base-g-event-id",
      );
      expect(unchangedBaseEvent?.title).toBe("Weekly Team Sync");
    });
  });

  describe("Deleting a single instance", () => {
    it("should delete only the specified instance", async () => {
      // Setup base event and instances
      const baseEvent: Schema_Event = {
        _id: new ObjectId().toString(),
        gEventId: "base-g-event-id",
        title: "Weekly Team Sync",
        startDate: "2024-03-20T10:00:00Z",
        endDate: "2024-03-20T11:00:00Z",
        recurrence: {
          rule: ["RRULE:FREQ=WEEKLY"],
          eventId: "base-g-event-id",
        },
        user: setup.userId,
        origin: Origin.GOOGLE,
        priority: Priorities.WORK,
        isAllDay: false,
        isSomeday: false,
        updatedAt: new Date(),
      };

      const instance: Schema_Event = {
        _id: new ObjectId().toString(),
        gEventId: "instance-1-g-id",
        title: "Weekly Team Sync",
        startDate: "2024-03-27T10:00:00Z",
        endDate: "2024-03-27T11:00:00Z",
        recurrence: {
          rule: [],
          eventId: "base-g-event-id",
        },
        user: setup.userId,
        origin: Origin.GOOGLE,
        priority: Priorities.WORK,
        isAllDay: false,
        isSomeday: false,
        updatedAt: new Date(),
      };

      // Add events to database
      await mongoService.event.insertOne(baseEvent);
      await mongoService.event.insertOne(instance);

      // Execute
      await provider.deleteInstance(instance._id as string);

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

  describe("Deleting an entire series", () => {
    it("should delete the base event and all instances", async () => {
      // Setup base event and instances
      const baseEvent: Schema_Event = {
        _id: new ObjectId().toString(),
        gEventId: "base-g-event-id",
        title: "Weekly Team Sync",
        startDate: "2024-03-20T10:00:00Z",
        endDate: "2024-03-20T11:00:00Z",
        recurrence: {
          rule: ["RRULE:FREQ=WEEKLY"],
          eventId: "base-g-event-id",
        },
        user: setup.userId,
        origin: Origin.GOOGLE,
        priority: Priorities.WORK,
        isAllDay: false,
        isSomeday: false,
        updatedAt: new Date(),
      };

      const instance: Schema_Event = {
        _id: new ObjectId().toString(),
        gEventId: "instance-1-g-id",
        title: "Weekly Team Sync",
        startDate: "2024-03-27T10:00:00Z",
        endDate: "2024-03-27T11:00:00Z",
        recurrence: {
          rule: [],
          eventId: "base-g-event-id",
        },
        user: setup.userId,
        origin: Origin.GOOGLE,
        priority: Priorities.WORK,
        isAllDay: false,
        isSomeday: false,
        updatedAt: new Date(),
      };

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
});
