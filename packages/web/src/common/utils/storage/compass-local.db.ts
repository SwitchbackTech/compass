import Dexie, { Table } from "dexie";
import { Event_Core } from "@core/types/event.types";

class CompassLocalDB extends Dexie {
  events!: Table<Event_Core, string>; // string is the key type (_id)

  constructor() {
    super("compass-local");
    this.version(1).stores({
      events: "_id, startDate, endDate, isSomeday",
    });
  }
}

export const compassLocalDB = new CompassLocalDB();
