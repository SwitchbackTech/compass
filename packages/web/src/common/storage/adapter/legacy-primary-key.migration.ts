import Dexie, { Table } from "dexie";
import { Event_Core } from "@core/types/event.types";
import { StoredTask } from "./storage.adapter";

const DB_NAME = "compass-local";

/** Detect Dexie UpgradeError from legacy schema (tasks keyed by "id" not "_id"). */
export function isPrimaryKeyUpgradeError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.name === "UpgradeError" &&
    error.message.includes("changing primary key")
  );
}

/** Tasks table shape from legacy schema (primary key was "id" not "_id"). */
type LegacyStoredTask = Omit<StoredTask, "_id"> & { id: string };

/**
 * Dexie database matching the OLD CompassLocalDB schema (tasks: "id").
 * Used only to read and migrate data when UpgradeError occurs.
 *
 * @internal Exported for testing
 */
export class LegacyCompassDB extends Dexie {
  events!: Table<Event_Core, string>;
  tasks!: Table<LegacyStoredTask, string>;

  constructor(dbName = DB_NAME) {
    super(dbName);
    this.version(1).stores({
      events: "_id, startDate, endDate, isSomeday",
    });
    this.version(2).stores({
      events: "_id, startDate, endDate, isSomeday",
      tasks: "id, dateKey, status, order",
    });
  }
}

function legacyTaskToStoredTask(legacy: LegacyStoredTask): StoredTask {
  const { id, ...rest } = legacy;
  return { ...rest, _id: id } as StoredTask;
}

export interface LegacyMigrationResult {
  events: Event_Core[];
  tasks: StoredTask[];
}

/**
 * Extract all events and tasks from a database using the legacy schema
 * (tasks table keyed by "id" instead of "_id").
 */
export async function extractDataFromLegacySchema(): Promise<LegacyMigrationResult> {
  const legacyDb = new LegacyCompassDB();
  await legacyDb.open();

  const [events, legacyTasks] = await Promise.all([
    legacyDb.events.toArray(),
    legacyDb.tasks.toArray(),
  ]);

  const tasks: StoredTask[] = legacyTasks.map(legacyTaskToStoredTask);
  legacyDb.close();

  return { events, tasks };
}

export async function deleteCompassLocalDb(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}
