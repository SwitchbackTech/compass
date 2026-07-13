import Dexie, { type Table } from "dexie";
import { type EventId } from "@core/types/domain-primitives";
import { type EventListQuery } from "@core/types/event-command.contracts";
import { getLocalCalendarSentinelId } from "@web/calendars/local-calendar.sentinel";
import { transformLegacyEvents } from "@web/common/storage/migrations/data/legacy-event-to-local-record.transform";
import { type LocalEventRecord } from "@web/common/storage/types/local-event.record";
import {
  normalizeTask,
  normalizeTasks,
  type Task,
} from "@web/common/types/task.types";
import {
  deleteCompassLocalDb,
  extractDataFromLegacySchema,
  isPrimaryKeyUpgradeError,
} from "./legacy-primary-key.migration";
import {
  type MigrationRecord,
  type OfflineDataStore,
  type StoredTask,
} from "./offline-data.store";

/**
 * Dexie database schema for Compass local storage.
 *
 * Schema versioning is handled by Dexie's built-in version() method.
 */
class CompassDB extends Dexie {
  events!: Table<LocalEventRecord, string>;
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

    // Version 4 (B13): events store LocalEventRecord ({ version, id, event,
    // isDemo }), keyed by "id", indexed on the nested schedule so range
    // reads can eventually use the index instead of a full scan.
    // The primary key rename from "_id" to "id" is not an in-place Dexie
    // upgrade (see isPrimaryKeyUpgradeError); rows are migrated in
    // migrateFromLegacySchema below.
    this.version(4).stores({
      events:
        "id, event.schedule.kind, event.schedule.start, event.schedule.end",
      tasks: "_id, dateKey, status, order",
      _migrations: "id",
    });

    // Version 5: the "someday" schedule kind was removed. Purge any local
    // records that still carry it so the events table only ever holds
    // timed/allDay schedules (the read/write paths no longer handle someday).
    this.version(5)
      .stores({
        events:
          "id, event.schedule.kind, event.schedule.start, event.schedule.end",
        tasks: "_id, dateKey, status, order",
        _migrations: "id",
      })
      .upgrade(async (tx) => {
        await tx
          .table<LocalEventRecord, string>("events")
          .filter(
            (record) =>
              (record.event?.schedule as { kind?: string } | undefined)
                ?.kind === "someday",
          )
          .delete();
      });
  }
}

/**
 * IndexedDB implementation of OfflineDataStore using Dexie.
 *
 * This store encapsulates all IndexedDB-specific logic, including:
 * - Schema versioning via Dexie
 * - Dexie transaction management
 * - Query optimization using indexes
 */
export class IndexedDbOfflineDataStore implements OfflineDataStore {
  private db = new CompassDB();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized && this.db.isOpen()) {
      return;
    }

    try {
      await this.db.open();
    } catch (error) {
      if (!isPrimaryKeyUpgradeError(error)) {
        throw error;
      }

      await this.migrateFromLegacySchema();
    }

    this.initialized = true;
  }

  /**
   * Handle UpgradeError from a legacy DB whose primary key(s) Dexie cannot
   * rename in place: tasks used "id" instead of "_id", and/or events used
   * "_id" with flat fields instead of "id" with a nested LocalEventRecord
   * (B13). Read data with the legacy schema, delete the DB, re-open with
   * the current schema, transform and re-insert.
   */
  private async migrateFromLegacySchema(): Promise<void> {
    const { events, tasks, migrations } = await extractDataFromLegacySchema();
    await deleteCompassLocalDb();
    await this.db.open();

    const sentinelCalendarId = getLocalCalendarSentinelId();
    const eventRecords = transformLegacyEvents(events, sentinelCalendarId);

    if (eventRecords.length > 0 || tasks.length > 0 || migrations.length > 0) {
      await this.db.transaction(
        "rw",
        this.db.events,
        this.db.tasks,
        this.db._migrations,
        async () => {
          if (eventRecords.length > 0) {
            await this.db.events.bulkPut(eventRecords);
          }
          if (tasks.length > 0) {
            await this.db.tasks.bulkPut(tasks);
          }
          if (migrations.length > 0) {
            await this.db._migrations.bulkPut(migrations);
          }
        },
      );
      // biome-ignore lint/suspicious/noConsole: Preserve local migration summary output.
      console.log(
        `[Migration] Migrated ${eventRecords.length} events and ${tasks.length} tasks from legacy schema`,
      );
    }
  }

  isReady(): boolean {
    return this.initialized && this.db.isOpen();
  }

  close(): void {
    this.db.close();
    this.initialized = false;
  }

  // ─── Task Operations ───────────────────────────────────────────────────────

  async getTasks(dateKey: string): Promise<Task[]> {
    const storedTasks = await this.db.tasks
      .where("dateKey")
      .equals(dateKey)
      .toArray();

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
      if (existingTask && existingTask.dateKey !== fromDateKey) return;

      await this.db.tasks.delete(normalizedTask._id);
      const storedTask: StoredTask = { ...normalizedTask, dateKey: toDateKey };
      await this.db.tasks.put(storedTask);
    });
  }

  async clearAllTasks(): Promise<void> {
    await this.db.tasks.clear();
  }

  // ─── Event Operations ──────────────────────────────────────────────────────

  async getEvents(query: EventListQuery): Promise<LocalEventRecord[]> {
    const all = await this.db.events.toArray();

    const start = Date.parse(query.start);
    const end = Date.parse(query.end);
    const allDayStart = query.start.slice(0, 10);
    const allDayEnd = query.end.slice(0, 10);

    return all.filter(({ event }) => {
      if (
        query.priorities.length > 0 &&
        !query.priorities.includes(event.priority)
      ) {
        return false;
      }

      if (event.schedule.kind === "timed") {
        return (
          Date.parse(event.schedule.start) < end &&
          Date.parse(event.schedule.end) > start
        );
      }

      if (event.schedule.kind === "allDay") {
        return (
          event.schedule.start < allDayEnd && event.schedule.end > allDayStart
        );
      }

      return false;
    });
  }

  async getAllEvents(): Promise<LocalEventRecord[]> {
    return this.db.events.toArray();
  }

  async putEvent(record: LocalEventRecord): Promise<void> {
    await this.db.events.put(record);
  }

  async putEvents(records: LocalEventRecord[]): Promise<void> {
    if (records.length > 0) {
      await this.db.events.bulkPut(records);
    }
  }

  async deleteEvent(eventId: EventId): Promise<void> {
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
