import Dexie, { Table } from "dexie";
import { Schema_GridEvent } from "@web/common/types/web.event.types";

/**
 * Extended event type for IndexedDB storage.
 * Reuses the existing Schema_GridEvent type and ensures _id is present.
 */
export type ClientEvent = Schema_GridEvent & {
  /**
   * For local-only events, `_id` is a client-generated string.
   * For now, we only persist local events here, not provider-backed ones.
   */
  _id: string;
};

/**
 * Dexie database for local storage of events and tasks.
 * Used when user is not authenticated with Google Calendar.
 */
export class CompassLocalDB extends Dexie {
  events!: Table<ClientEvent, string>;

  constructor() {
    super("compass-local");

    // Version 1: initial schema
    this.version(1).stores({
      // Primary key and indexes
      // _id is the PK; we also index on startDate/endDate/isSomeday for range queries
      events: "_id, startDate, endDate, isSomeday, createdAt",
    });

    // Future versions: add .version(2)... etc with explicit migrations.
  }
}

// Singleton instance of the database
export const compassLocalDB = new CompassLocalDB();
