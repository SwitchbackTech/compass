import { type EventSchedule } from "@core/types/event.contracts";
import { createMockLocalEventRecord } from "@web/__tests__/utils/factories/event.factory";
import { deleteCompassLocalDb } from "@web/__tests__/utils/storage/indexeddb.test.util";
import { IndexedDbOfflineDataStore } from "@web/common/storage/offline-data/indexeddb-offline-data.store";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const SOMEDAY_SCHEDULE = {
  kind: "someday" as const,
  period: "week" as const,
  anchorDate: "2026-05-05",
  sortOrder: 0,
} as unknown as Extract<EventSchedule, { kind: "someday" }>;

const withAnchorDate = (anchorDate: string) =>
  ({ ...SOMEDAY_SCHEDULE, anchorDate }) as unknown as Extract<
    EventSchedule,
    { kind: "someday" }
  >;

/**
 * Regression coverage for #1946: a stale reorder write used to overwrite an
 * event's schedule because it round-tripped the whole record through
 * getAllEvents()/putEvent(). This exercises the real Dexie + fake-indexeddb
 * store directly (bypassing the offline-data.store.registry mock other test
 * files install) via the exact store methods LocalEventRepository.replace()
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

  it("keeps an edited event's new schedule after a reorder lands afterward", async () => {
    const record = createMockLocalEventRecord({ schedule: SOMEDAY_SCHEDULE });
    await store.putEvent(record);

    // Simulate a month → week drag: the date edit commits first, then a
    // reorder (queued for the destination view) lands after it.
    await store.putEvent({
      ...record,
      event: {
        ...record.event,
        schedule: withAnchorDate("2026-05-12"),
      },
    });
    await store.updateEventOrders([{ eventId: record.id, sortOrder: 7 }]);

    const [stored] = await store.getAllEvents();

    expect(stored?.event.schedule).toMatchObject({
      anchorDate: "2026-05-12",
      sortOrder: 7,
    });
  });

  it("never reverts an in-flight schedule edit when reorder and edit race", async () => {
    const record = createMockLocalEventRecord({ schedule: SOMEDAY_SCHEDULE });
    await store.putEvent(record);

    await Promise.all([
      store.updateEventOrders([{ eventId: record.id, sortOrder: 3 }]),
      store.putEvent({
        ...record,
        event: {
          ...record.event,
          schedule: withAnchorDate("2026-05-19"),
        },
      }),
    ]);

    const [stored] = await store.getAllEvents();

    // Regardless of which write lands last, reorder only ever patches
    // sortOrder, so the edited anchorDate must always survive.
    expect(stored?.event.schedule).toMatchObject({
      anchorDate: "2026-05-19",
    });
  });
});
