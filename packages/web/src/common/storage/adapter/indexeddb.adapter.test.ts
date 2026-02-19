/**
 * Tests for the IndexedDB storage adapter.
 *
 * Uses fake-indexeddb (see web.test.start.ts) for in-memory IndexedDB support.
 */
import { Event_Core } from "@core/types/event.types";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { createTestEvent } from "@web/__tests__/utils/repositories/repository.test.factory";
import { clearCompassLocalDb } from "@web/__tests__/utils/storage/indexeddb.test.util";
import { IndexedDBAdapter } from "./indexeddb.adapter";
import { LegacyCompassDB } from "./legacy-primary-key.migration";

describe("IndexedDBAdapter", () => {
  let adapter: IndexedDBAdapter;

  beforeEach(async () => {
    await clearCompassLocalDb();
    adapter = new IndexedDBAdapter();
  });

  afterEach(async () => {
    await clearCompassLocalDb();
  });

  describe("initialize", () => {
    it("opens the database and sets ready state", async () => {
      await adapter.initialize();

      expect(adapter.isReady()).toBe(true);
    });

    it("is idempotent when already initialized", async () => {
      await adapter.initialize();
      await adapter.initialize();

      expect(adapter.isReady()).toBe(true);
    });

    it("migrates from legacy schema (tasks keyed by id) to _id", async () => {
      const legacyDb = new LegacyCompassDB();
      await legacyDb.open();

      await legacyDb.tasks.bulkAdd([
        {
          id: "legacy-task-1",
          title: "Legacy Task 1",
          status: "todo",
          order: 0,
          createdAt: new Date().toISOString(),
          user: "user-1",
          dateKey: "2025-01-15",
        },
        {
          id: "legacy-task-2",
          title: "Legacy Task 2",
          status: "todo",
          order: 1,
          createdAt: new Date().toISOString(),
          user: "user-1",
          dateKey: "2025-01-15",
        },
      ]);

      legacyDb.close();

      const migratedAdapter = new IndexedDBAdapter();
      await migratedAdapter.initialize();

      const tasks = await migratedAdapter.getTasks("2025-01-15");

      expect(tasks).toHaveLength(2);
      expect(tasks.map((t) => t._id)).toEqual([
        "legacy-task-1",
        "legacy-task-2",
      ]);
      expect(tasks.map((t) => t.title)).toEqual([
        "Legacy Task 1",
        "Legacy Task 2",
      ]);
    });
  });

  describe("task operations", () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it("puts and gets tasks for a date", async () => {
      const dateKey = "2025-01-15";
      const tasks = [
        createMockTask({ _id: "task-1", title: "Task 1" }),
        createMockTask({ _id: "task-2", title: "Task 2" }),
      ];

      await adapter.putTasks(dateKey, tasks);
      const result = await adapter.getTasks(dateKey);

      expect(result).toHaveLength(2);
      expect(result.map((t) => t._id)).toEqual(["task-1", "task-2"]);
      expect(result.map((t) => t.title)).toEqual(["Task 1", "Task 2"]);
    });

    it("putTask inserts new task", async () => {
      const dateKey = "2025-01-15";
      const task = createMockTask({ _id: "task-1", title: "New task" });

      await adapter.putTask(dateKey, task);
      const result = await adapter.getTasks(dateKey);

      expect(result).toHaveLength(1);
      expect(result[0]._id).toBe("task-1");
      expect(result[0].title).toBe("New task");
    });

    it("putTask updates existing task", async () => {
      const dateKey = "2025-01-15";
      await adapter.putTasks(dateKey, [
        createMockTask({ _id: "task-1", title: "Original" }),
      ]);

      await adapter.putTask(dateKey, {
        ...createMockTask({ _id: "task-1" }),
        title: "Updated",
      });
      const result = await adapter.getTasks(dateKey);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Updated");
    });

    it("putTask works alongside putTasks", async () => {
      const dateKeyA = "2025-01-15";
      const dateKeyB = "2025-01-16";
      await adapter.putTasks(dateKeyA, [
        createMockTask({ _id: "task-1", title: "Date A" }),
      ]);

      await adapter.putTask(
        dateKeyB,
        createMockTask({ _id: "task-2", title: "Date B" }),
      );

      const tasksA = await adapter.getTasks(dateKeyA);
      const tasksB = await adapter.getTasks(dateKeyB);

      expect(tasksA).toHaveLength(1);
      expect(tasksA[0].title).toBe("Date A");
      expect(tasksB).toHaveLength(1);
      expect(tasksB[0].title).toBe("Date B");
    });

    it("replaces tasks when putting for same date", async () => {
      const dateKey = "2025-01-15";
      await adapter.putTasks(dateKey, [
        createMockTask({ _id: "task-1", title: "Original" }),
      ]);
      await adapter.putTasks(dateKey, [
        createMockTask({ _id: "task-2", title: "Replaced" }),
      ]);

      const result = await adapter.getTasks(dateKey);

      expect(result).toHaveLength(1);
      expect(result[0]._id).toBe("task-2");
      expect(result[0].title).toBe("Replaced");
    });

    it("returns empty array for date with no tasks", async () => {
      const result = await adapter.getTasks("2025-01-01");

      expect(result).toEqual([]);
    });

    it("deletes a task by id", async () => {
      const dateKey = "2025-01-15";
      await adapter.putTasks(dateKey, [
        createMockTask({ _id: "task-1" }),
        createMockTask({ _id: "task-2" }),
      ]);

      await adapter.deleteTask("task-1");

      const result = await adapter.getTasks(dateKey);
      expect(result).toHaveLength(1);
      expect(result[0]._id).toBe("task-2");
    });

    it("moves task between dates", async () => {
      const task = createMockTask({ _id: "task-1", title: "Move me" });
      await adapter.putTasks("2025-01-15", [task]);

      await adapter.moveTask(task, "2025-01-15", "2025-01-16");

      const fromDate = await adapter.getTasks("2025-01-15");
      const toDate = await adapter.getTasks("2025-01-16");

      expect(fromDate).toHaveLength(0);
      expect(toDate).toHaveLength(1);
      expect(toDate[0]._id).toBe("task-1");
    });

    it("clears all tasks", async () => {
      await adapter.putTasks("2025-01-15", [createMockTask({ _id: "task-1" })]);
      await adapter.putTasks("2025-01-16", [createMockTask({ _id: "task-2" })]);

      await adapter.clearAllTasks();

      expect(await adapter.getTasks("2025-01-15")).toHaveLength(0);
      expect(await adapter.getTasks("2025-01-16")).toHaveLength(0);
    });
  });

  describe("event operations", () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it("puts and gets events", async () => {
      const event = createTestEvent({
        _id: "event-1",
        title: "Test Event",
        startDate: "2025-01-15",
        endDate: "2025-01-15",
      });

      await adapter.putEvent(event);
      const events = await adapter.getEvents("2025-01-15", "2025-01-15");

      expect(events).toHaveLength(1);
      expect(events[0]._id).toBe("event-1");
      expect(events[0].title).toBe("Test Event");
    });

    it("filters events by date range", async () => {
      await adapter.putEvent(
        createTestEvent({
          _id: "e1",
          startDate: "2025-01-15",
          endDate: "2025-01-15",
        }),
      );
      await adapter.putEvent(
        createTestEvent({
          _id: "e2",
          startDate: "2025-01-20",
          endDate: "2025-01-20",
        }),
      );

      const events = await adapter.getEvents("2025-01-15", "2025-01-16");

      expect(events).toHaveLength(1);
      expect(events[0]._id).toBe("e1");
    });

    it("filters by isSomeday when specified", async () => {
      const somedayEvent = createTestEvent({
        _id: "e1",
        startDate: "2025-01-15",
        endDate: "2025-01-15",
        isSomeday: true,
      });
      const regularEvent = createTestEvent({
        _id: "e2",
        startDate: "2025-01-15",
        endDate: "2025-01-15",
        isSomeday: false,
      });
      await adapter.putEvent(somedayEvent);
      await adapter.putEvent(regularEvent);

      const somedayEvents = await adapter.getEvents(
        "2025-01-15",
        "2025-01-15",
        true,
      );
      const regularEvents = await adapter.getEvents(
        "2025-01-15",
        "2025-01-15",
        false,
      );

      expect(somedayEvents).toHaveLength(1);
      expect(somedayEvents[0]._id).toBe("e1");
      expect(regularEvents).toHaveLength(1);
      expect(regularEvents[0]._id).toBe("e2");
    });

    it("throws when putting event without _id", async () => {
      const event = createTestEvent({ title: "No ID" }) as Event_Core;
      delete event._id;

      await expect(adapter.putEvent(event)).rejects.toThrow(
        "Event must have an _id to save",
      );
    });

    it("deletes event by id", async () => {
      const event = createTestEvent({ _id: "event-1" });
      await adapter.putEvent(event);

      await adapter.deleteEvent("event-1");

      const events = await adapter.getAllEvents();
      expect(events).toHaveLength(0);
    });

    it("clears all events", async () => {
      await adapter.putEvent(createTestEvent({ _id: "e1" }));
      await adapter.putEvent(createTestEvent({ _id: "e2" }));

      await adapter.clearAllEvents();

      expect(await adapter.getAllEvents()).toHaveLength(0);
    });
  });

  describe("migration tracking", () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it("records and retrieves migration records", async () => {
      await adapter.setMigrationRecord("migration-1");
      await adapter.setMigrationRecord("migration-2");

      const records = await adapter.getMigrationRecords();

      expect(records).toHaveLength(2);
      expect(records.map((r) => r.id).sort()).toEqual([
        "migration-1",
        "migration-2",
      ]);
      expect(records[0].completedAt).toBeDefined();
    });
  });
});
