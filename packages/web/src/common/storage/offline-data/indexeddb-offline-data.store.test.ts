import Dexie from "dexie";
import { deleteCompassLocalDb } from "@web/__tests__/utils/storage/indexeddb.test.util";
import { IndexedDbOfflineDataStore } from "./indexeddb-offline-data.store";
import { type StoredTask } from "./offline-data.store";
import { afterEach, describe, expect, it } from "bun:test";

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
});
