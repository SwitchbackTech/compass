import { ObjectId } from "mongodb";
import { createMockCalendarListEntry } from "@core/__tests__/helpers/gcal.factory";
import { Resource_Sync } from "@core/types/sync.types";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { compassTestState } from "@backend/__tests__/helpers/mock.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";
import { sseServer } from "@backend/servers/sse/sse.server";
import { googleCalendarSyncService } from "@backend/sync/services/google-sync/google-sync.service";
import * as syncImportService from "@backend/sync/services/import/google-import.service";
import { googleWatchService } from "@backend/sync/services/watch/google-watch.service";
import userService from "@backend/user/services/user.service";
import userMetadataService from "@backend/user/services/user-metadata.service";

const seedPrimaryGoogleCalendar = async (userId: ObjectId) => {
  await mongoService.calendar.insertOne({
    _id: new ObjectId(),
    userId,
    name: "Primary",
    description: "",
    timeZone: "America/Denver",
    foregroundColor: "#000000",
    backgroundColor: "#ffffff",
    access: "owner",
    isPrimary: true,
    isVisible: true,
    isActive: true,
    source: { provider: "google", calendarId: "primary", etag: "etag-1" },
    createdAt: new Date(),
    updatedAt: null,
  });
};

describe("googleCalendarSyncService", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterEach(() => jest.restoreAllMocks());
  afterAll(cleanupTestDb);

  describe("importLatestGoogleCalendarChanges", () => {
    it("skips incremental import when already in progress or completed", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const importEndSpy = jest.spyOn(sseServer, "publishImportCompleted");
      const createSyncImportSpy = jest.spyOn(
        syncImportService,
        "createSyncImport",
      );

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { incrementalGCalSync: "COMPLETED" } },
      });

      await googleCalendarSyncService.importLatestGoogleCalendarChanges(userId);

      expect(createSyncImportSpy).not.toHaveBeenCalled();
      expect(importEndSpy).not.toHaveBeenCalled();
    });

    it("emits importCompleted when incremental import completes", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      await seedPrimaryGoogleCalendar(user._id);
      const importEndSpy = jest.spyOn(sseServer, "publishImportCompleted");
      const eventsChangedSpy = jest.spyOn(sseServer, "publishEventsChanged");

      jest.spyOn(syncImportService, "createSyncImport").mockResolvedValue({
        importLatestEvents: jest.fn().mockResolvedValue({
          totalProcessed: 1,
          totalSaved: 1,
          totalDeleted: 0,
          totalIgnored: 0,
          totalInvalid: 0,
        }),
      } as unknown as Awaited<
        ReturnType<typeof syncImportService.createSyncImport>
      >);

      await googleCalendarSyncService.importLatestGoogleCalendarChanges(userId);

      expect(importEndSpy).toHaveBeenCalledWith(userId, {
        operation: "incremental",
        eventsCount: 1,
        calendarsCount: 1,
      });
      expect(eventsChangedSpy).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ reason: "reconciled" }),
      );
    });
  });

  describe("initializeGoogleCalendarSync", () => {
    it("starts Google watches only after full import succeeds", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const callOrder: string[] = [];
      const startWatching = googleWatchService.startGoogleWatches;

      jest.spyOn(syncImportService, "createSyncImport").mockResolvedValue({
        importAllEvents: jest.fn().mockImplementation(async () => {
          callOrder.push("importFull");
          return {
            nextSyncToken: "next-sync-token",
            totalProcessed: 0,
            totalSaved: 0,
            totalDeleted: 0,
            totalIgnored: 0,
            totalInvalid: 0,
          };
        }),
      } as unknown as Awaited<
        ReturnType<typeof syncImportService.createSyncImport>
      >);
      jest
        .spyOn(googleWatchService, "startGoogleWatches")
        .mockImplementation(async (...args) => {
          callOrder.push("startWatching");
          return startWatching(...args);
        });

      await googleCalendarSyncService.initializeGoogleCalendarSync(userId);

      expect(callOrder).toEqual(["importFull", "startWatching"]);
    });

    it("imports events for every owner/writer/reader calendar and skips freeBusyReader calendars", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      compassTestState().calendarlist = [
        createMockCalendarListEntry({
          id: "primary-cal",
          primary: true,
          accessRole: "owner",
        }),
        createMockCalendarListEntry({
          id: "reader-cal",
          primary: false,
          accessRole: "reader",
        }),
        createMockCalendarListEntry({
          id: "freebusy-cal",
          primary: false,
          accessRole: "freeBusyReader",
        }),
      ];

      const importAllEvents = jest
        .fn()
        .mockImplementation(
          async (
            _userId: string,
            calendar: { source: { calendarId: string } },
          ) => ({
            totalProcessed: 1,
            totalSaved: 1,
            totalDeleted: 0,
            totalIgnored: 0,
            totalInvalid: 0,
            nextSyncToken: `token-${calendar.source.calendarId}`,
          }),
        );
      jest.spyOn(syncImportService, "createSyncImport").mockResolvedValue({
        importAllEvents,
      } as unknown as Awaited<
        ReturnType<typeof syncImportService.createSyncImport>
      >);

      const result =
        await googleCalendarSyncService.initializeGoogleCalendarSync(userId);

      expect(result.eventsCount).toBe(2);
      expect(result.calendarsCount).toBe(2);
      expect(result.failedCalendars).toEqual([]);

      const importedGCalendarIds = importAllEvents.mock.calls.map(
        ([, calendar]) => calendar.source.calendarId,
      );
      expect(importedGCalendarIds.sort()).toEqual([
        "primary-cal",
        "reader-cal",
      ]);
      expect(importedGCalendarIds).not.toContain("freebusy-cal");

      const freeBusyRecord = await mongoService.calendar.findOne({
        userId: user._id,
        "source.calendarId": "freebusy-cal",
      });
      expect(freeBusyRecord).not.toBeNull();

      const sync = await mongoService.sync.findOne({ user: userId });
      const eventSyncGCalendarIds =
        sync?.google?.events?.map((e) => e.gCalendarId) ?? [];
      expect(eventSyncGCalendarIds).not.toContain("freebusy-cal");
    });

    it("attributes each imported event to its own Compass calendar id when importing calendars concurrently", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      compassTestState().calendarlist = [
        createMockCalendarListEntry({
          id: "primary-cal",
          primary: true,
          accessRole: "owner",
        }),
        createMockCalendarListEntry({
          id: "second-cal",
          primary: false,
          accessRole: "writer",
        }),
      ];

      const seenCalendarIds: string[] = [];
      const importAllEvents = jest
        .fn()
        .mockImplementation(
          async (
            _userId: string,
            calendar: { _id: ObjectId; source: { calendarId: string } },
          ) => {
            seenCalendarIds.push(calendar._id.toHexString());
            return {
              totalProcessed: 1,
              totalSaved: 1,
              totalDeleted: 0,
              totalIgnored: 0,
              totalInvalid: 0,
              nextSyncToken: `token-${calendar.source.calendarId}`,
            };
          },
        );
      jest.spyOn(syncImportService, "createSyncImport").mockResolvedValue({
        importAllEvents,
      } as unknown as Awaited<
        ReturnType<typeof syncImportService.createSyncImport>
      >);

      await googleCalendarSyncService.initializeGoogleCalendarSync(userId);

      const calendarRecords = await mongoService.calendar
        .find({ userId: user._id, "source.provider": "google" })
        .toArray();
      const recordIds = calendarRecords.map((c) => c._id.toHexString());

      // Every call received a distinct, real Compass calendar id - no
      // cross-attribution between the two concurrently-imported calendars.
      expect(new Set(seenCalendarIds).size).toBe(2);
      expect(seenCalendarIds.sort()).toEqual(recordIds.sort());
    });

    it("does not abort other calendars when one calendar's import fails, and still starts watches for primary", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      compassTestState().calendarlist = [
        createMockCalendarListEntry({
          id: "primary-cal",
          primary: true,
          accessRole: "owner",
        }),
        createMockCalendarListEntry({
          id: "broken-cal",
          primary: false,
          accessRole: "reader",
        }),
      ];

      const importAllEvents = jest
        .fn()
        .mockImplementation(
          async (
            _userId: string,
            calendar: { source: { calendarId: string } },
          ) => {
            if (calendar.source.calendarId === "broken-cal") {
              throw new Error("simulated calendar import failure");
            }
            return {
              totalProcessed: 1,
              totalSaved: 1,
              totalDeleted: 0,
              totalIgnored: 0,
              totalInvalid: 0,
              nextSyncToken: "token-primary-cal",
            };
          },
        );
      jest.spyOn(syncImportService, "createSyncImport").mockResolvedValue({
        importAllEvents,
      } as unknown as Awaited<
        ReturnType<typeof syncImportService.createSyncImport>
      >);
      const startWatchesSpy = jest
        .spyOn(googleWatchService, "startGoogleWatches")
        .mockResolvedValue(undefined as never);

      const result =
        await googleCalendarSyncService.initializeGoogleCalendarSync(userId);

      expect(result.eventsCount).toBe(1);
      expect(result.calendarsCount).toBe(1);
      expect(result.failedCalendars).toHaveLength(1);
      expect(result.failedCalendars[0]?.error).toContain(
        "simulated calendar import failure",
      );
      expect(startWatchesSpy).toHaveBeenCalledWith(
        userId,
        expect.arrayContaining([
          expect.objectContaining({ gCalendarId: "primary-cal" }),
        ]),
        expect.anything(),
      );
    });

    it("starts an Events watch for every successfully-imported event-capable calendar plus exactly one CalendarList watch", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      compassTestState().calendarlist = [
        createMockCalendarListEntry({
          id: "primary-cal",
          primary: true,
          accessRole: "owner",
        }),
        createMockCalendarListEntry({
          id: "reader-cal",
          primary: false,
          accessRole: "reader",
        }),
        createMockCalendarListEntry({
          id: "broken-cal",
          primary: false,
          accessRole: "writer",
        }),
        createMockCalendarListEntry({
          id: "freebusy-cal",
          primary: false,
          accessRole: "freeBusyReader",
        }),
      ];

      const importAllEvents = jest
        .fn()
        .mockImplementation(
          async (
            _userId: string,
            calendar: { source: { calendarId: string } },
          ) => {
            if (calendar.source.calendarId === "broken-cal") {
              throw new Error("simulated calendar import failure");
            }
            return {
              totalProcessed: 1,
              totalSaved: 1,
              totalDeleted: 0,
              totalIgnored: 0,
              totalInvalid: 0,
              nextSyncToken: `token-${calendar.source.calendarId}`,
            };
          },
        );
      jest.spyOn(syncImportService, "createSyncImport").mockResolvedValue({
        importAllEvents,
      } as unknown as Awaited<
        ReturnType<typeof syncImportService.createSyncImport>
      >);
      const startWatchesSpy = jest
        .spyOn(googleWatchService, "startGoogleWatches")
        .mockResolvedValue(undefined as never);

      await googleCalendarSyncService.initializeGoogleCalendarSync(userId);

      expect(startWatchesSpy).toHaveBeenCalledTimes(1);
      const watchParams = startWatchesSpy.mock.calls[0]?.[1] ?? [];
      const gCalendarIds = watchParams.map((p) => p.gCalendarId);

      expect(
        gCalendarIds.filter((id) => id === Resource_Sync.CALENDAR),
      ).toHaveLength(1);
      expect(gCalendarIds.sort()).toEqual(
        [Resource_Sync.CALENDAR, "primary-cal", "reader-cal"].sort(),
      );
      expect(gCalendarIds).not.toContain("broken-cal");
      expect(gCalendarIds).not.toContain("freebusy-cal");
    });

    it("fails the whole sync when the primary calendar's import fails", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      compassTestState().calendarlist = [
        createMockCalendarListEntry({
          id: "primary-cal",
          primary: true,
          accessRole: "owner",
        }),
      ];

      jest.spyOn(syncImportService, "createSyncImport").mockResolvedValue({
        importAllEvents: jest
          .fn()
          .mockRejectedValue(new Error("primary calendar import failure")),
      } as unknown as Awaited<
        ReturnType<typeof syncImportService.createSyncImport>
      >);

      await expect(
        googleCalendarSyncService.initializeGoogleCalendarSync(userId),
      ).rejects.toThrow("primary calendar import failure");
    });
  });

  describe("startGoogleCalendarSyncIfNeeded", () => {
    it("skips sync setup when import is completed", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();
      const importEndSpy = jest.spyOn(sseServer, "publishImportCompleted");

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "COMPLETED" } },
      });

      const stopSpy = jest.spyOn(userService, "stopGoogleCalendarSync");
      const startSpy = jest.spyOn(
        googleCalendarSyncService,
        "initializeGoogleCalendarSync",
      );

      await googleCalendarSyncService.startGoogleCalendarSyncIfNeeded(userId);

      expect(stopSpy).not.toHaveBeenCalled();
      expect(startSpy).not.toHaveBeenCalled();
      expect(importEndSpy).not.toHaveBeenCalled();
    });
  });

  describe("repairGoogleCalendarSync", () => {
    it("forces sync setup when import is completed", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const userId = user._id.toString();

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "COMPLETED" } },
      });

      const stopSpy = jest
        .spyOn(userService, "stopGoogleCalendarSync")
        .mockResolvedValue();
      const startSpy = jest
        .spyOn(googleCalendarSyncService, "initializeGoogleCalendarSync")
        .mockResolvedValue({
          eventsCount: 0,
          calendarsCount: 0,
          failedCalendars: [],
        });

      await googleCalendarSyncService.repairGoogleCalendarSync(userId);

      expect(stopSpy).toHaveBeenCalledWith(userId);
      expect(startSpy).toHaveBeenCalledWith(userId);
    });
  });
});
