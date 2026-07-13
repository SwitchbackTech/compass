import { deleteCompassLocalDb } from "@web/__tests__/utils/storage/indexeddb.test.util";
import { IndexedDbOfflineDataStore } from "./indexeddb-offline-data.store";
import { afterEach, describe, expect, it } from "bun:test";

describe("IndexedDbOfflineDataStore (real Dexie + fake-indexeddb)", () => {
  afterEach(async () => {
    await deleteCompassLocalDb();
  });

  it("persists and reads back a task through a real IndexedDB round trip", async () => {
    const store = new IndexedDbOfflineDataStore();
    await store.initialize();

    expect(store.isReady()).toBe(true);

    await store.putTask("2026-07-07", {
      _id: "task-1",
      title: "Write a real Dexie test",
      status: "todo",
      order: 0,
      createdAt: "2026-07-07T00:00:00.000Z",
    });

    const tasks = await store.getTasks("2026-07-07");

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      _id: "task-1",
      title: "Write a real Dexie test",
      status: "todo",
    });

    store.close();
  });
});
