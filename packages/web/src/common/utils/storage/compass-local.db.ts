import Dexie, { Table } from "dexie";
import { Event_Core } from "@core/types/event.types";
import { Task } from "@web/common/types/task.types";

/**
 * Task stored in IndexedDB with associated dateKey
 */
export type StoredTask = Task & {
  dateKey: string;
};

class CompassLocalDB extends Dexie {
  events!: Table<Event_Core, string>; // string is the key type (_id)
  tasks!: Table<StoredTask, string>; // string is the key type (id)

  constructor() {
    super("compass-local");

    // Version 1: events table only
    this.version(1).stores({
      events: "_id, startDate, endDate, isSomeday",
    });

    // Version 2: add tasks table
    this.version(2).stores({
      events: "_id, startDate, endDate, isSomeday",
      tasks: "id, dateKey, status, order",
    });
  }
}

export const compassLocalDB = new CompassLocalDB();
