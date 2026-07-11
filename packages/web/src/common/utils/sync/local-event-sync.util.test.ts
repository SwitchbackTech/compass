import { createMockLocalEventRecord } from "@web/__tests__/utils/factories/event.factory";
import { createSyncLocalEventsToCloud } from "./local-event-sync.util";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const ensureOfflineDataStoreReady = mock();
const getAllEvents = mock();
const clearAllEvents = mock();
const createEvent = mock();
const listCalendars = mock();

const syncLocalEventsToCloud = createSyncLocalEventsToCloud({
  createEvent,
  listCalendars,
  ensureOfflineDataStoreReady,
  getOfflineDataStore: () => ({
    clearAllEvents,
    getAllEvents,
  }),
});

const SERVER_LOCAL_CALENDAR_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";

describe("syncLocalEventsToCloud", () => {
  beforeEach(() => {
    ensureOfflineDataStoreReady.mockClear();
    getAllEvents.mockClear();
    clearAllEvents.mockClear();
    createEvent.mockClear();
    listCalendars.mockClear();
    listCalendars.mockResolvedValue([
      {
        id: SERVER_LOCAL_CALENDAR_ID,
        name: "Local",
        description: "",
        timeZone: null,
        foregroundColor: "#000000",
        backgroundColor: "#ffffff",
        provider: "local",
        access: "owner",
        capabilities: {
          canReadAvailability: true,
          canReadDetails: true,
          canWrite: true,
          canManage: false,
          canWatchEvents: false,
        },
        isPrimary: true,
        isVisible: true,
        isActive: true,
      },
    ]);
  });

  it("syncs user-created events and skips demo events, mapping onto the server local calendar", async () => {
    const userRecord = createMockLocalEventRecord({}, false);
    const demoRecord = createMockLocalEventRecord({}, true);
    getAllEvents.mockResolvedValue([userRecord, demoRecord]);

    await expect(syncLocalEventsToCloud()).resolves.toBe(1);

    expect(createEvent).toHaveBeenCalledTimes(1);
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        id: userRecord.event.id,
        calendarId: SERVER_LOCAL_CALENDAR_ID,
      }),
    );
    expect(clearAllEvents).toHaveBeenCalledTimes(1);
  });

  it("clears local demo events without sending them to the backend", async () => {
    getAllEvents.mockResolvedValue([createMockLocalEventRecord({}, true)]);

    await expect(syncLocalEventsToCloud()).resolves.toBe(0);

    expect(createEvent).not.toHaveBeenCalled();
    expect(listCalendars).not.toHaveBeenCalled();
    expect(clearAllEvents).toHaveBeenCalledTimes(1);
  });

  it("returns 0 and skips network calls entirely when storage is empty", async () => {
    getAllEvents.mockResolvedValue([]);

    await expect(syncLocalEventsToCloud()).resolves.toBe(0);

    expect(createEvent).not.toHaveBeenCalled();
    expect(clearAllEvents).not.toHaveBeenCalled();
  });
});
