import { faker } from "@faker-js/faker";
import { ObjectId } from "mongodb";
import { Resource_Sync } from "@core/types/sync.types";
import { WatchSchema } from "@core/types/watch.types";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { invalidGrant400Error } from "@backend/__tests__/mocks.gcal/errors/error.google.invalidGrant";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";
import { sseServer } from "@backend/servers/sse/sse.server";
import {
  buildEventRecord,
  seedGoogleCalendar,
  seedLocalCalendar,
} from "@backend/sync/services/event-propagation/__tests__/event-propagation.test-helpers";
import { updateSync } from "@backend/sync/services/records/sync-records.repository";
import { googleWatchService } from "@backend/sync/services/watch/google-watch.service";
import { googleWatchMaintenanceService } from "@backend/sync/services/watch/google-watch-maintenance.service";
import { googleWatchRepairService } from "@backend/sync/services/watch/google-watch-repair.service";
import userService from "@backend/user/services/user.service";

describe("googleWatchMaintenanceService", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterEach(() => jest.restoreAllMocks());
  afterAll(cleanupTestDb);

  it("returns maintenance buckets in dry mode without mutating watches", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();
    const watch = {
      _id: new ObjectId(),
      user: userId,
      resourceId: "resource-id",
      expiration: new Date(Date.now() - 60_000),
      gCalendarId: "primary",
      createdAt: new Date(),
    };
    await mongoService.watch.insertOne(watch);

    const result = await googleWatchMaintenanceService.runMaintenanceByUser(
      userId,
      { dry: true },
    );

    expect(result.prune[0].payload).toEqual([watch]);
    expect(await mongoService.watch.countDocuments({ user: userId })).toBe(1);
  });

  it("9: A29 regression - an invalid_grant error during prune archives/prunes Google data instead of wiping the account", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();

    // A freshly created user has no lastSeenAt/lastLoggedInAt yet -> inactive
    // -> every watch lands in the prune bucket (prepWatchMaintenanceForUser's
    // activity gate).
    const localCalendar = await seedLocalCalendar(user._id);
    const localEvent = await mongoService.event.insertOne(
      buildEventRecord(localCalendar._id),
    );
    const googleCalendar = await seedGoogleCalendar(user._id);
    await mongoService.watch.insertOne(
      WatchSchema.parse({
        _id: new ObjectId(),
        user: userId,
        resourceId: faker.string.uuid(),
        expiration: new Date(Date.now() + 60 * 60 * 1000),
        gCalendarId: googleCalendar.source.calendarId,
        createdAt: new Date(),
      }),
    );

    const deleteCompassDataSpy = jest.spyOn(
      userService,
      "deleteCompassDataForUser",
    );
    // stopWatch already swallows an invalid_grant Google response
    // internally (see google-watch.service.test.ts), deleting the local
    // watch without throwing - mocking stopWatch directly here isolates
    // the planner's OWN catch/A29 handling instead of re-proving
    // stopWatch's already-covered behavior.
    jest
      .spyOn(googleWatchService, "stopWatch")
      .mockRejectedValue(invalidGrant400Error);
    const publishSyncStatusSpy = jest.spyOn(sseServer, "publishSyncStatus");

    const result =
      await googleWatchMaintenanceService.runMaintenanceByUser(userId);

    expect(deleteCompassDataSpy).not.toHaveBeenCalled();
    expect(await mongoService.user.findOne({ _id: user._id })).not.toBeNull();
    expect(
      await mongoService.calendar.findOne({ _id: localCalendar._id }),
    ).not.toBeNull();
    expect(
      await mongoService.event.findOne({ _id: localEvent.insertedId }),
    ).not.toBeNull();
    expect(
      await mongoService.calendar.findOne({ _id: googleCalendar._id }),
    ).toMatchObject({ isActive: false });
    expect(publishSyncStatusSpy).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ code: "GOOGLE_REVOKED" }),
    );
    expect(result.revoked).toBeGreaterThan(0);
  });

  it("10: an active user with an expiring watch routes through the repair coordinator and refreshes", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();

    // A recent lastSeenAt (touched on every SSE (re)connect) is what the
    // activity gate now keys off - seeding it directly exercises the real
    // hasUserBeenActiveSince check instead of mocking it away.
    await mongoService.user.updateOne(
      { _id: user._id },
      { $set: { lastSeenAt: new Date() } },
    );

    await updateSync(Resource_Sync.CALENDAR, userId, Resource_Sync.CALENDAR, {
      nextSyncToken: faker.string.alphanumeric(16),
    });
    await mongoService.watch.insertOne(
      WatchSchema.parse({
        _id: new ObjectId(),
        user: userId,
        resourceId: faker.string.uuid(),
        // Inside SYNC_BUFFER_DAYS (3) but still in the future.
        expiration: new Date(Date.now() + 24 * 60 * 60 * 1000),
        gCalendarId: Resource_Sync.CALENDAR,
        createdAt: new Date(),
      }),
    );

    const repairSpy = jest.spyOn(
      googleWatchRepairService,
      "repairGoogleWatchesForUser",
    );

    const result =
      await googleWatchMaintenanceService.runMaintenanceByUser(userId);

    expect(repairSpy).toHaveBeenCalledWith(userId);
    expect(result.repairAction).toBe("REFRESHED");
  });
});
