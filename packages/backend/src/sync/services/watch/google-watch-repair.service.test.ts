import { faker } from "@faker-js/faker";
import { ObjectId, type WithId } from "mongodb";
import { Resource_Sync } from "@core/types/sync.types";
import { type Schema_User } from "@core/types/user.types";
import { type Schema_Watch, WatchSchema } from "@core/types/watch.types";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { compassTestState } from "@backend/__tests__/helpers/mock.setup";
import { invalidGrant400Error } from "@backend/__tests__/mocks.gcal/errors/error.google.invalidGrant";
import { invalidSyncTokenError } from "@backend/__tests__/mocks.gcal/errors/error.invalidSyncToken";
import { mockRegularGcalEvent } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { sseServer } from "@backend/servers/sse/sse.server";
import { seedLocalCalendar } from "@backend/sync/services/event-propagation/__tests__/event-propagation.test-helpers";
import { googleCalendarSyncService } from "@backend/sync/services/google-sync/google-sync.service";
import {
  getWatchRepairState,
  updateSync,
} from "@backend/sync/services/records/sync-records.repository";
import { googleWatchService } from "@backend/sync/services/watch/google-watch.service";
import { googleWatchRepairService } from "@backend/sync/services/watch/google-watch-repair.service";

const FAR_FUTURE = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

const buildGoogleCalendar = (
  userId: ObjectId,
  overrides: Partial<CalendarRecord> = {},
): CalendarRecord => ({
  _id: new ObjectId(),
  userId,
  name: "Calendar",
  description: "",
  timeZone: "America/Denver",
  foregroundColor: "#000000",
  backgroundColor: "#ffffff",
  access: "writer",
  isPrimary: false,
  isVisible: true,
  isActive: true,
  source: { provider: "google", calendarId: "cal", etag: "etag-1" },
  createdAt: new Date(),
  updatedAt: null,
  ...overrides,
});

const seedActiveGoogleCalendar = async (
  userId: ObjectId,
  gCalendarId: string,
  overrides: Partial<CalendarRecord> = {},
): Promise<CalendarRecord> => {
  const calendar = buildGoogleCalendar(userId, {
    ...overrides,
    source: { provider: "google", calendarId: gCalendarId, etag: "etag-1" },
  });
  await mongoService.calendar.insertOne(calendar);
  return calendar;
};

const seedWatch = async (
  userId: string,
  gCalendarId: string,
  overrides: Partial<Schema_Watch> = {},
): Promise<Schema_Watch> => {
  const watch = WatchSchema.parse({
    _id: new ObjectId(),
    user: userId,
    resourceId: faker.string.uuid(),
    expiration: FAR_FUTURE(),
    gCalendarId,
    createdAt: new Date(),
    ...overrides,
  });
  await mongoService.watch.insertOne(watch);
  return watch;
};

const seedCalendarlistToken = (
  userId: string,
  token: string = faker.string.alphanumeric(16),
) =>
  updateSync(Resource_Sync.CALENDAR, userId, Resource_Sync.CALENDAR, {
    nextSyncToken: token,
  });

const seedEventsSyncEntry = (
  userId: string,
  gCalendarId: string,
  token: string = faker.string.alphanumeric(16),
) =>
  updateSync(Resource_Sync.EVENTS, userId, gCalendarId, {
    nextSyncToken: token,
  });

/**
 * Seeds one active, event-capable calendar with a token-bearing events sync
 * entry and a healthy (far-future) watch; returns its Google calendar id.
 */
const seedHealthyCalendar = async (
  user: WithId<Schema_User>,
  gCalendarId: string = faker.string.uuid(),
): Promise<string> => {
  const userId = user._id.toString();
  await seedActiveGoogleCalendar(user._id, gCalendarId);
  await seedEventsSyncEntry(userId, gCalendarId);
  await seedWatch(userId, gCalendarId);
  return gCalendarId;
};

/**
 * Seeds a user with a fully healthy Google watch state: calendarlist token
 * + watch, plus `calendarCount` event-capable calendars each with a
 * token-bearing sync entry and a healthy watch. Mirrors the identically
 * named helper in google-watch-state.test.ts.
 */
const seedHealthyUser = async (calendarCount: number) => {
  const user = await UserDriver.createUser();
  const userId = user._id.toString();

  await seedCalendarlistToken(userId);
  await seedWatch(userId, Resource_Sync.CALENDAR);

  const gCalendarIds: string[] = [];
  for (let i = 0; i < calendarCount; i += 1) {
    gCalendarIds.push(await seedHealthyCalendar(user));
  }

  return { user, userId, gCalendarIds };
};

/** seedHealthyUser(1) with that one calendar's watch deleted - the
 *  "missed a notification while unwatched" starting point shared by the
 *  catch-up tests (6, 7, 8). */
const seedUserWithOneMissingWatch = async () => {
  const { user, userId, gCalendarIds } = await seedHealthyUser(1);
  const gCalendarId = gCalendarIds[0]!;
  await mongoService.watch.deleteOne({ user: userId, gCalendarId });
  return { user, userId, gCalendarId };
};

describe("googleWatchRepairService", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterEach(() => jest.restoreAllMocks());
  afterAll(cleanupTestDb);

  describe("repairGoogleWatchesForUser", () => {
    it("1: HEALTHY makes zero Google calls and zero lease writes", async () => {
      const { userId } = await seedHealthyUser(2);

      const getEventsSpy = jest.spyOn(gcalService, "getEvents");
      const watchEventsSpy = jest.spyOn(gcalService, "watchEvents");
      const watchCalendarsSpy = jest.spyOn(gcalService, "watchCalendars");
      const stopWatchSpy = jest.spyOn(gcalService, "stopWatch");

      const result =
        await googleWatchRepairService.repairGoogleWatchesForUser(userId);

      expect(result.action).toBe("HEALTHY");
      expect(getEventsSpy).not.toHaveBeenCalled();
      expect(watchEventsSpy).not.toHaveBeenCalled();
      expect(watchCalendarsSpy).not.toHaveBeenCalled();
      expect(stopWatchSpy).not.toHaveBeenCalled();

      const state = await getWatchRepairState(userId);
      expect(state).toEqual({ leaseExpiresAt: null, lastAttemptAt: null });
    });

    it("2: two concurrent runs perform exactly one repair; the other is skipped", async () => {
      const { userId, gCalendarId } = await seedUserWithOneMissingWatch();

      // Hold the winner INSIDE its repair (lease acquired, watch-start in
      // flight) until the loser has fully returned. Without this gate the
      // interleaving is timing-dependent: a fast winner completes and
      // releases before the loser even reaches the lease, and the loser
      // then trips the cooldown instead - or worse, repairs again. The
      // invariant under test is exactly-once repair, not which of the two
      // guards (cooldown vs lease) turned the loser away, so the loser's
      // skip reason may be either.
      const realStartGoogleWatches =
        googleWatchService.startGoogleWatches.bind(googleWatchService);
      let releaseWinner!: () => void;
      const winnerGate = new Promise<void>((resolve) => {
        releaseWinner = resolve;
      });
      const startGoogleWatchesSpy = jest
        .spyOn(googleWatchService, "startGoogleWatches")
        .mockImplementation(async (...args) => {
          await winnerGate;
          return realStartGoogleWatches(...args);
        });

      const firstPromise =
        googleWatchRepairService.repairGoogleWatchesForUser(userId);

      // Wait until the winner is provably inside the repair step (lease
      // held) before racing the loser against it.
      while (startGoogleWatchesSpy.mock.calls.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      const second =
        await googleWatchRepairService.repairGoogleWatchesForUser(userId);
      releaseWinner();
      const first = await firstPromise;

      expect(first.action).toBe("REPAIRED");
      expect(second.action).toBe("SKIPPED");
      expect(["COOLDOWN", "LOCKED"]).toContain(second.reason);

      // Only the winner actually attempted to start the missing watch.
      expect(startGoogleWatchesSpy).toHaveBeenCalledTimes(1);

      const watches = await mongoService.watch
        .find({ user: userId, gCalendarId })
        .toArray();
      expect(watches).toHaveLength(1);
    });

    it("3: an expired lease is recovered from - acquisition succeeds and repair runs", async () => {
      const { userId, gCalendarId } = await seedUserWithOneMissingWatch();

      // Simulate a crashed holder: an old lease that already expired, plus
      // an old attempt well outside the cooldown window.
      await mongoService.sync.updateOne(
        { user: userId },
        {
          $set: {
            "googleWatchRepair.leaseExpiresAt": new Date(Date.now() - 60_000),
            "googleWatchRepair.lastAttemptAt": new Date(
              Date.now() - 60 * 60 * 1000,
            ),
          },
        },
      );

      const result =
        await googleWatchRepairService.repairGoogleWatchesForUser(userId);

      expect(result.action).toBe("REPAIRED");
      expect(
        await mongoService.watch.findOne({ user: userId, gCalendarId }),
      ).not.toBeNull();
    });

    it("4: a recent lastAttemptAt with no lease held SKIPs on COOLDOWN without Google calls (persisted, not in-memory)", async () => {
      const { userId } = await seedUserWithOneMissingWatch();

      await mongoService.sync.updateOne(
        { user: userId },
        { $set: { "googleWatchRepair.lastAttemptAt": new Date() } },
      );

      const startGoogleWatchesSpy = jest.spyOn(
        googleWatchService,
        "startGoogleWatches",
      );

      const result =
        await googleWatchRepairService.repairGoogleWatchesForUser(userId);

      expect(result).toMatchObject({ action: "SKIPPED", reason: "COOLDOWN" });
      expect(startGoogleWatchesSpy).not.toHaveBeenCalled();
    });

    it("5: repairing a missing watch is idempotent across repeated runs (no duplicate watches)", async () => {
      const { userId, gCalendarId } = await seedUserWithOneMissingWatch();

      const first =
        await googleWatchRepairService.repairGoogleWatchesForUser(userId);
      expect(first.action).toBe("REPAIRED");
      expect(
        await mongoService.watch.countDocuments({ user: userId, gCalendarId }),
      ).toBe(1);

      // Simulate real time passing: clear the cooldown, and push the
      // channel the first run just created (test env: CHANNEL_EXPIRATION_MIN
      // = 5, so it's otherwise "expiring soon" the instant it's created)
      // safely past the refresh buffer.
      await mongoService.sync.updateOne(
        { user: userId },
        {
          $set: {
            "googleWatchRepair.lastAttemptAt": new Date(
              Date.now() - 60 * 60 * 1000,
            ),
          },
        },
      );
      await mongoService.watch.updateOne(
        { user: userId, gCalendarId },
        { $set: { expiration: FAR_FUTURE() } },
      );

      const second =
        await googleWatchRepairService.repairGoogleWatchesForUser(userId);
      expect(second.action).toBe("HEALTHY");
      expect(
        await mongoService.watch.countDocuments({ user: userId, gCalendarId }),
      ).toBe(1);
    });

    it("6: catch-up after a missed notification starts the watch and imports the missed event", async () => {
      const { userId, gCalendarId } = await seedUserWithOneMissingWatch();

      const missedEvent = mockRegularGcalEvent({ id: "missed-during-outage" });
      compassTestState().events.gcalEvents.all.push(missedEvent);

      const result =
        await googleWatchRepairService.repairGoogleWatchesForUser(userId);

      expect(result.action).toBe("REPAIRED");
      expect(
        await mongoService.watch.findOne({ user: userId, gCalendarId }),
      ).not.toBeNull();
      expect(
        await mongoService.event.findOne({
          "externalReference.eventId": "missed-during-outage",
        }),
      ).not.toBeNull();
    });

    it("7: a 410 during catch-up import falls back to a full repair", async () => {
      const { userId } = await seedUserWithOneMissingWatch();

      jest
        .spyOn(gcalService, "getEvents")
        .mockRejectedValueOnce(invalidSyncTokenError);
      const fullRepairSpy = jest
        .spyOn(googleCalendarSyncService, "repairGoogleCalendarSync")
        .mockResolvedValue(undefined);

      const result =
        await googleWatchRepairService.repairGoogleWatchesForUser(userId);

      expect(result.action).toBe("FULL_REPAIR_STARTED");
      expect(fullRepairSpy).toHaveBeenCalledWith(userId);
    });

    it("8: revoked credentials during repair prune Google data, preserve Compass-local data, and notify GOOGLE_REVOKED", async () => {
      const { user, userId, gCalendarId } = await seedUserWithOneMissingWatch();

      const localCalendar = await seedLocalCalendar(user._id);
      const localEvent = await mongoService.event.insertOne({
        _id: new ObjectId(),
        calendarId: localCalendar._id,
        content: { kind: "details", title: "Local event", description: "" },
        schedule: {
          kind: "timed",
          start: new Date("2026-07-14T15:00:00.000Z"),
          end: new Date("2026-07-14T16:00:00.000Z"),
          timeZone: "America/Denver",
        },
        recurrence: { kind: "single" },
        priority: "unassigned",
        externalReference: null,
        createdAt: new Date(),
        updatedAt: null,
      });

      jest
        .spyOn(gcalService, "getEvents")
        .mockRejectedValueOnce(invalidGrant400Error);
      const publishSyncStatusSpy = jest.spyOn(sseServer, "publishSyncStatus");

      const result =
        await googleWatchRepairService.repairGoogleWatchesForUser(userId);

      expect(result.action).toBe("PRUNED");

      // Compass-local data survives untouched.
      expect(
        await mongoService.calendar.findOne({ _id: localCalendar._id }),
      ).not.toBeNull();
      expect(
        await mongoService.event.findOne({ _id: localEvent.insertedId }),
      ).not.toBeNull();

      // Google data is gone: calendar archived, watches deleted, refresh
      // token cleared.
      const googleCalendarRow = await mongoService.calendar.findOne({
        userId: user._id,
        "source.calendarId": gCalendarId,
      });
      expect(googleCalendarRow?.isActive).toBe(false);
      expect(await mongoService.watch.countDocuments({ user: userId })).toBe(0);
      const updatedUser = await mongoService.user.findOne({ _id: user._id });
      expect(updatedUser?.google?.gRefreshToken).toBe("");

      expect(publishSyncStatusSpy).toHaveBeenCalledWith(userId, {
        status: "attention",
        code: "GOOGLE_REVOKED",
        retryable: false,
      });
    });
  });
});
