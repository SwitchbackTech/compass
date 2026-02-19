/**
 * Compass local database - compatibility layer.
 *
 * @deprecated This module is deprecated. Use the StorageAdapter directly.
 *
 * For direct database access in tests, you can still import compassLocalDB,
 * but new code should use getStorageAdapter() from @web/common/storage/adapter.
 *
 * @see {@link @web/common/storage/adapter}
 */
import Dexie, { Table } from "dexie";
import { Event_Core } from "@core/types/event.types";
import { Task } from "@web/common/types/task.types";

/**
 * Task stored in IndexedDB with associated dateKey
 * @deprecated Use StoredTask from @web/common/storage/adapter instead
 */
export type StoredTask = Task & {
  dateKey: string;
};

/**
 * Legacy database class for backward compatibility.
 * @deprecated Use StorageAdapter instead
 */
class CompassLocalDB extends Dexie {
  events!: Table<Event_Core, string>;
  tasks!: Table<StoredTask, string>;

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

    // Note: Version 3 adds _migrations table, defined in IndexedDBAdapter
  }
}

/**
 * Legacy database instance for backward compatibility.
 * @deprecated Use getStorageAdapter() instead
 */
export const compassLocalDB = new CompassLocalDB();
