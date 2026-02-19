import { Event_Core } from "@core/types/event.types";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import {
  ensureStorageReady,
  getStorageAdapter,
} from "@web/common/storage/adapter/adapter";
import { saveEventToIndexedDB } from "@web/common/utils/storage/event.storage.util";
import { EventApi } from "@web/ducks/events/event.api";
import { syncLocalEventsToCloud } from "./local-event-sync.util";

describe("syncLocalEventsToCloud", () => {
  const mockCreate = jest.spyOn(EventApi, "create");

  const createMockEvent = (overrides?: Partial<Event_Core>) =>
    createMockStandaloneEvent(overrides) as Event_Core;

  beforeEach(async () => {
    mockCreate.mockResolvedValue({} as never);
    await ensureStorageReady();
    await getStorageAdapter().clearAllEvents();
  });

  afterEach(() => {
    mockCreate.mockClear();
  });

  it("should sync local events to the API and clear IndexedDB", async () => {
    const event1 = createMockEvent();
    const event2 = createMockEvent();

    await saveEventToIndexedDB(event1);
    await saveEventToIndexedDB(event2);

    const count = await syncLocalEventsToCloud();

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ _id: event1._id }),
        expect.objectContaining({ _id: event2._id }),
      ]),
    );
    expect(count).toBe(2);

    const remainingEvents = await getStorageAdapter().getAllEvents();
    expect(remainingEvents).toHaveLength(0);
  });

  it("should skip API calls when there are no local events", async () => {
    const count = await syncLocalEventsToCloud();

    expect(mockCreate).not.toHaveBeenCalled();
    expect(count).toBe(0);
  });
});
