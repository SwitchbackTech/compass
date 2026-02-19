import Dexie, { Table } from "dexie";
import { Event_Core } from "@core/types/event.types";
import { isDateRangeOverlapping } from "@core/util/date/date.util";
import {
  Task,
  normalizeTask,
  normalizeTasks,
} from "@web/common/types/task.types";
import { MigrationRecord, StorageAdapter, StoredTask } from "./storage.adapter";

/**
 * Dexie database schema for Compass local storage.
 *
 * Schema versioning is handled by Dexie's built-in version() method.
 */
class CompassDB extends Dexie {
  events!: Table<Event_Core, string>;
  tasks!: Table<StoredTask, string>;
  _migrations!: Table<MigrationRecord, string>;

  constructor() {
    super("compass-local");

    // Version 1: events table only
    this.version(1).stores({
      events: "_id, startDate, endDate, isSomeday",
    });

    // Version 2: add tasks table
    this.version(2).stores({
      events: "_id, startDate, endDate, isSomeday",
      tasks: "_id, dateKey, status, order",
    });

    // Version 3: add migrations tracking table
    this.version(3).stores({
      events: "_id, startDate, endDate, isSomeday",
      tasks: "_id, dateKey, status, order",
      _migrations: "id",
    });
  }
}

/**
 * IndexedDB implementation of StorageAdapter using Dexie.
 *
 * This adapter encapsulates all IndexedDB-specific logic, including:
 * - Schema versioning via Dexie
 * - Dexie transaction management
 * - Query optimization using indexes
 */
export class IndexedDBAdapter implements StorageAdapter {
  private db = new CompassDB();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized && this.db.isOpen()) {
      return;
    }

    await this.db.open();
    this.initialized = true;
  }

  isReady(): boolean {
    return this.initialized && this.db.isOpen();
  }

  // ─── Task Operations ───────────────────────────────────────────────────────

  async getTasks(dateKey: string): Promise<Task[]> {
    const storedTasks = await this.db.tasks
      .where("dateKey")
      .equals(dateKey)
      .toArray();

    // Remove dateKey and normalize (ensures defaults like user are applied)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return storedTasks.map(({ dateKey: _, ...task }) => normalizeTask(task));
  }

  async getAllTasks(): Promise<StoredTask[]> {
    return this.db.tasks.toArray();
  }

  async putTasks(dateKey: string, tasks: Task[]): Promise<void> {
    const storedTasks: StoredTask[] = normalizeTasks(tasks).map((task) => ({
      ...task,
      dateKey,
    }));

    await this.db.transaction("rw", this.db.tasks, async () => {
      // Replace all tasks for this date atomically
      await this.db.tasks.where("dateKey").equals(dateKey).delete();
      if (storedTasks.length > 0) {
        await this.db.tasks.bulkPut(storedTasks);
      }
    });
  }

  async putTask(dateKey: string, task: Task): Promise<void> {
    const normalizedTask = normalizeTask(task);
    const storedTask: StoredTask = { ...normalizedTask, dateKey };
    await this.db.tasks.put(storedTask);
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.db.tasks.delete(taskId);
  }

  async moveTask(
    task: Task,
    fromDateKey: string,
    toDateKey: string,
  ): Promise<void> {
    const normalizedTask = normalizeTask(task);

    await this.db.transaction("rw", this.db.tasks, async () => {
      const existingTask = await this.db.tasks.get(normalizedTask._id);

      // If the task exists for a different date, don't move it
      if (existingTask && existingTask.dateKey !== fromDateKey) {
        return;
      }

      // Remove from source date (task id stays the same)
      await this.db.tasks.delete(normalizedTask._id);

      // Add to target date
      const storedTask: StoredTask = { ...normalizedTask, dateKey: toDateKey };
      await this.db.tasks.put(storedTask);
    });
  }

  async clearAllTasks(): Promise<void> {
    await this.db.tasks.clear();
  }

  /**
   * For use in tests only. Puts a raw stored task without normalization.
   * Use when testing migration/normalization of legacy data.
   */
  async putRawStoredTaskForTesting(storedTask: StoredTask): Promise<void> {
    await this.db.tasks.put(storedTask);
  }

  // ─── Event Operations ──────────────────────────────────────────────────────

  async getEvents(
    startDate: string,
    endDate: string,
    isSomeday?: boolean,
  ): Promise<Event_Core[]> {
    const allEvents = await this.db.events.toArray();

    return allEvents.filter((event) => {
      if (!event.startDate || !event.endDate) return false;
      if (isSomeday !== undefined && event.isSomeday !== isSomeday) {
        return false;
      }
      return isDateRangeOverlapping(
        event.startDate,
        event.endDate,
        startDate,
        endDate,
        "day",
      );
    });
  }

  async getAllEvents(): Promise<Event_Core[]> {
    return this.db.events.toArray();
  }

  async putEvent(event: Event_Core): Promise<void> {
    if (!event._id) {
      throw new Error("Event must have an _id to save");
    }
    await this.db.events.put(event);
  }

  async putEvents(events: Event_Core[]): Promise<void> {
    const validEvents = events.filter((e) => e._id);
    if (validEvents.length > 0) {
      await this.db.events.bulkPut(validEvents);
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.db.events.delete(eventId);
  }

  async clearAllEvents(): Promise<void> {
    await this.db.events.clear();
  }

  // ─── Migration Tracking ────────────────────────────────────────────────────

  async getMigrationRecords(): Promise<MigrationRecord[]> {
    return this.db._migrations.toArray();
  }

  async setMigrationRecord(id: string): Promise<void> {
    await this.db._migrations.put({
      id,
      completedAt: new Date().toISOString(),
    });
  }
}
