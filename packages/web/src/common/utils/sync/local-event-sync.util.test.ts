import { Event_Core } from "@core/types/event.types";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { compassLocalDB } from "@web/common/utils/storage/compass-local.db";
import { saveEventToIndexedDB } from "@web/common/utils/storage/event.storage.util";
import { EventApi } from "@web/ducks/events/event.api";
import { syncLocalEventsToCloud } from "./local-event-sync.util";

describe("syncLocalEventsToCloud", () => {
  const mockCreate = jest.spyOn(EventApi, "create");

  const createMockEvent = (overrides?: Partial<Event_Core>) =>
    createMockStandaloneEvent(overrides) as Event_Core;

  beforeEach(async () => {
    mockCreate.mockResolvedValue({} as never);
    await compassLocalDB.events.clear();
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

    const remainingEvents = await compassLocalDB.events.toArray();
    expect(remainingEvents).toHaveLength(0);
  });

  it("should skip API calls when there are no local events", async () => {
    const count = await syncLocalEventsToCloud();

    expect(mockCreate).not.toHaveBeenCalled();
    expect(count).toBe(0);
  });
});
