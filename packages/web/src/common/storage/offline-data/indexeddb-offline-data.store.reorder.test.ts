import { Origin, Priorities } from "@core/constants/core.constants";
import { deleteCompassLocalDb } from "@web/__tests__/utils/storage/indexeddb.test.util";
import { IndexedDbOfflineDataStore } from "@web/common/storage/offline-data/indexeddb-offline-data.store";
import { type LocalStoredEvent } from "@web/common/storage/types/local-event.types";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const makeEvent = (
  overrides: Partial<LocalStoredEvent> = {},
): LocalStoredEvent => ({
  _id: "event-1",
  title: "Someday task",
  startDate: "2026-05-05T09:00:00.000Z",
  endDate: "2026-05-05T10:00:00.000Z",
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  isSomeday: true,
  user: "unauthenticated",
  ...overrides,
});

/**
 * Regression coverage for #1946: a stale reorder write used to overwrite an
 * event's dates because it round-tripped the whole record through
 * getAllEvents()/putEvent(). This exercises the real Dexie + fake-indexeddb
 * store directly (bypassing the offline-data.store.registry mock other test
 * files install) via the exact store methods LocalEventRepository.edit()
 * and .reorder() delegate to.
 */
describe("IndexedDbOfflineDataStore reorder/edit interaction", () => {
  let store: IndexedDbOfflineDataStore;

  beforeEach(async () => {
    store = new IndexedDbOfflineDataStore();
    await store.initialize();
  });

  afterEach(async () => {
    store.close();
    await deleteCompassLocalDb();
  });

  it("keeps an edited event's new dates after a reorder lands afterward", async () => {
    await store.putEvent(makeEvent({ order: 0 }));

    // Simulate a month → week drag: the date edit commits first, then a
    // reorder (queued for the destination view) lands after it.
    await store.putEvent(
      makeEvent({
        startDate: "2026-05-12T09:00:00.000Z",
        endDate: "2026-05-12T10:00:00.000Z",
      }),
    );
    await store.updateEventOrders([{ _id: "event-1", order: 7 }]);

    const [stored] = await store.getAllEvents();

    expect(stored.startDate).toBe("2026-05-12T09:00:00.000Z");
    expect(stored.endDate).toBe("2026-05-12T10:00:00.000Z");
    expect(stored.order).toBe(7);
  });

  it("never reverts an in-flight date edit when reorder and edit race", async () => {
    await store.putEvent(makeEvent({ order: 0 }));

    await Promise.all([
      store.updateEventOrders([{ _id: "event-1", order: 3 }]),
      store.putEvent(
        makeEvent({
          startDate: "2026-05-19T09:00:00.000Z",
          endDate: "2026-05-19T10:00:00.000Z",
        }),
      ),
    ]);

    const [stored] = await store.getAllEvents();

    // Regardless of which write lands last, reorder only ever patches the
    // `order` field, so the edited dates must always survive.
    expect(stored.startDate).toBe("2026-05-19T09:00:00.000Z");
    expect(stored.endDate).toBe("2026-05-19T10:00:00.000Z");
  });
});
