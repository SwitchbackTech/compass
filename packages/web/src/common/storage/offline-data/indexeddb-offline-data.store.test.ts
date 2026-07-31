import { faker } from "@faker-js/faker";
import Dexie from "dexie";
import { EventSchema } from "@core/types/event.contracts";
import { deleteCompassLocalDb } from "@web/__tests__/utils/storage/indexeddb.test.util";
import { type LocalEventRecord } from "@web/events/types/local-event.record";
import { IndexedDbOfflineDataStore } from "./indexeddb-offline-data.store";
import { type StoredTask } from "./offline-data.store";
import { afterEach, describe, expect, it } from "bun:test";

const localRecord = (overrides: {
  id?: string;
  schedule: LocalEventRecord["event"]["schedule"];
}): LocalEventRecord => {
  const id = overrides.id ?? faker.database.mongodbObjectId();
  const event = EventSchema.parse({
    id,
    calendarId: faker.database.mongodbObjectId(),
    content: { kind: "details", title: "Event", description: "" },
    schedule: overrides.schedule,
    recurrence: { kind: "single" },
    createdAt: "2026-07-14T09:00:00-06:00",
    updatedAt: null,
  });
  return { version: 2, id, event, isDemo: false };
};

describe("IndexedDbOfflineDataStore (real Dexie + fake-indexeddb)", () => {
  afterEach(async () => {
    await deleteCompassLocalDb();
  });

  it("retains the legacy tasks table for data recovery", async () => {
    const store = new IndexedDbOfflineDataStore();
    await store.initialize();

    expect(store.isReady()).toBe(true);

    const recoveryDb = new Dexie("compass-local");
    recoveryDb.version(4).stores({
      tasks: "_id, dateKey, status, order",
    });
    await recoveryDb.open();
    const tasks = recoveryDb.table<StoredTask, string>("tasks");
    await tasks.put({
      _id: "task-1",
      dateKey: "2026-07-07",
      title: "Write a real Dexie test",
      status: "todo",
      order: 0,
      createdAt: "2026-07-07T00:00:00.000Z",
      user: "local",
    });

    const recoveredTasks = await tasks.toArray();

    expect(recoveredTasks).toHaveLength(1);
    expect(recoveredTasks[0]).toMatchObject({
      _id: "task-1",
      title: "Write a real Dexie test",
      status: "todo",
    });

    recoveryDb.close();
    store.close();
  });

  it("reads and clears the tasks table via getAllTasks/clearAllTasks", async () => {
    const store = new IndexedDbOfflineDataStore();
    await store.initialize();

    const recoveryDb = new Dexie("compass-local");
    recoveryDb.version(4).stores({
      tasks: "_id, dateKey, status, order",
    });
    await recoveryDb.open();
    await recoveryDb.table<StoredTask, string>("tasks").put({
      _id: "task-1",
      dateKey: "2026-07-07",
      title: "Recover me",
      status: "todo",
      order: 0,
      createdAt: "2026-07-07T00:00:00.000Z",
      user: "local",
    });
    recoveryDb.close();

    expect(await store.getAllTasks()).toHaveLength(1);

    await store.clearAllTasks();

    expect(await store.getAllTasks()).toHaveLength(0);

    store.close();
  });

  it("counts tasks via getTaskCount without reading every row", async () => {
    const store = new IndexedDbOfflineDataStore();
    await store.initialize();

    expect(await store.getTaskCount()).toBe(0);

    const recoveryDb = new Dexie("compass-local");
    recoveryDb.version(4).stores({
      tasks: "_id, dateKey, status, order",
    });
    await recoveryDb.open();
    await recoveryDb.table<StoredTask, string>("tasks").put({
      _id: "task-1",
      dateKey: "2026-07-07",
      title: "Recover me",
      status: "todo",
      order: 0,
      createdAt: "2026-07-07T00:00:00.000Z",
      user: "local",
    });
    recoveryDb.close();

    expect(await store.getTaskCount()).toBe(1);

    await store.clearAllTasks();

    expect(await store.getTaskCount()).toBe(0);

    store.close();
  });

  it("getEvents returns overlapping timed and all-day rows without a full scan miss", async () => {
    const store = new IndexedDbOfflineDataStore();
    await store.initialize();

    const inWindowTimed = localRecord({
      id: "timed-in",
      schedule: {
        kind: "timed",
        start: "2026-07-15T09:00:00.000Z",
        end: "2026-07-15T10:00:00.000Z",
        timeZone: "UTC",
      },
    });
    const outsideTimed = localRecord({
      id: "timed-out",
      schedule: {
        kind: "timed",
        start: "2026-07-20T09:00:00.000Z",
        end: "2026-07-20T10:00:00.000Z",
        timeZone: "UTC",
      },
    });
    const spanningAllDay = localRecord({
      id: "allday-span",
      schedule: {
        kind: "allDay",
        start: "2026-07-14",
        end: "2026-07-17",
      },
    });
    const outsideAllDay = localRecord({
      id: "allday-out",
      schedule: {
        kind: "allDay",
        start: "2026-07-20",
        end: "2026-07-21",
      },
    });

    await store.putEvents([
      inWindowTimed,
      outsideTimed,
      spanningAllDay,
      outsideAllDay,
    ]);

    const results = await store.getEvents({
      start: "2026-07-15T00:00:00.000Z",
      end: "2026-07-16T00:00:00.000Z",
    });
    const ids = results.map((record) => record.id).sort();

    expect(ids).toEqual(["allday-span", "timed-in"]);

    store.close();
  });
});
