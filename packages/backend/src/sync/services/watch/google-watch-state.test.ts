import { ObjectId } from "mongodb";
import { Origin } from "@core/constants/core.constants";
import { Resource_Sync } from "@core/types/sync.types";
import dayjs from "@core/util/date/dayjs";
import { GoogleWatchDriver } from "@backend/__tests__/drivers/google-watch.driver";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";
import { updateSync } from "@backend/sync/services/records/sync-records.repository";
import { isUsingGcalWebhookHttps } from "@backend/sync/services/watch/google-watch-config";
import {
  GoogleWatchStateStatus,
  inspectGoogleWatchState,
} from "@backend/sync/services/watch/google-watch-state";

jest.mock("@backend/sync/services/watch/google-watch-config", () => ({
  ...jest.requireActual("@backend/sync/services/watch/google-watch-config"),
  isUsingGcalWebhookHttps: jest.fn(() => true),
}));

describe("googleWatchState", () => {
  beforeAll(async () => {
    initSupertokens();
    await setupTestDb();
  });
  beforeEach(async () => {
    (isUsingGcalWebhookHttps as jest.Mock).mockReturnValue(true);
    await cleanupCollections();
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(cleanupTestDb);

  it("returns healthy when every expected sync token and active Google Watch exists", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const userId = user._id.toString();

    await mongoService.watch.updateMany(
      { user: userId },
      { $set: { expiration: dayjs().add(10, "days").toDate() } },
    );

    await expect(inspectGoogleWatchState(userId)).resolves.toEqual(
      expect.objectContaining({
        status: GoogleWatchStateStatus.HEALTHY,
        expectedWatchCalendarIds: [Resource_Sync.CALENDAR, "test-calendar"],
        missingWatchCalendarIds: [],
      }),
    );
  });

  it("returns refresh required when expected Google Watches are expiring soon", async () => {
    const { user } = await UtilDriver.setupTestUser();

    const state = await inspectGoogleWatchState(user._id.toString());

    expect(state.status).toBe(GoogleWatchStateStatus.REFRESH_REQUIRED);
    expect(state.reason).toBe("WATCHES_EXPIRING_SOON");
    expect(state.watchesToRefresh).toHaveLength(2);
  });

  it("returns repair required when an expected Google Watch is missing", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const userId = user._id.toString();

    await mongoService.watch.deleteOne({
      user: userId,
      gCalendarId: Resource_Sync.CALENDAR,
    });

    await expect(inspectGoogleWatchState(userId)).resolves.toEqual(
      expect.objectContaining({
        status: GoogleWatchStateStatus.REPAIR_REQUIRED,
        reason: "WATCHES_MISSING",
        missingWatchCalendarIds: [Resource_Sync.CALENDAR],
      }),
    );
  });

  it("returns repair required when an expected Google Watch is expired", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const userId = user._id.toString();

    await mongoService.watch.updateOne(
      { user: userId, gCalendarId: "test-calendar" },
      { $set: { expiration: dayjs().subtract(1, "minute").toDate() } },
    );

    const state = await inspectGoogleWatchState(userId);

    expect(state.status).toBe(GoogleWatchStateStatus.REPAIR_REQUIRED);
    expect(state.reason).toBe("WATCHES_EXPIRED");
    expect(state.expiredWatches).toHaveLength(1);
  });

  it("returns full repair required when expected sync tokens are missing", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();

    await updateSync(Resource_Sync.CALENDAR, userId, Resource_Sync.CALENDAR, {
      nextSyncToken: "calendar-token",
    });
    await updateSync(Resource_Sync.EVENTS, userId, "primary", {
      nextSyncToken: undefined,
    });

    await expect(inspectGoogleWatchState(userId)).resolves.toEqual(
      expect.objectContaining({
        status: GoogleWatchStateStatus.FULL_REPAIR_REQUIRED,
        reason: "SYNC_TOKEN_MISSING",
      }),
    );
  });

  it("returns not applicable when Public watch notifications are not configured", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const userId = user._id.toString();

    (isUsingGcalWebhookHttps as jest.Mock).mockReturnValue(false);
    await GoogleWatchDriver.removeActiveGoogleWatchesForUser(userId);

    await expect(inspectGoogleWatchState(userId)).resolves.toEqual(
      expect.objectContaining({
        status: GoogleWatchStateStatus.NOT_APPLICABLE,
        reason: "PUBLIC_NOTIFICATIONS_DISABLED",
      }),
    );
  });

  it("returns repair required for duplicate active Google Watches", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const userId = user._id.toString();

    await mongoService.watch.insertOne({
      _id: new ObjectId(),
      user: userId,
      resourceId: "duplicate-resource",
      expiration: dayjs().add(1, "day").toDate(),
      gCalendarId: "test-calendar",
      createdAt: new Date(),
    });

    await expect(inspectGoogleWatchState(userId)).resolves.toEqual(
      expect.objectContaining({
        status: GoogleWatchStateStatus.REPAIR_REQUIRED,
        reason: "WATCHES_DUPLICATED",
      }),
    );
  });

  it("marks a Google-connected active user with no sync record for full repair", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();

    await mongoService.event.insertOne({
      user: userId,
      origin: Origin.COMPASS,
      updatedAt: new Date(),
    } as never);

    await expect(inspectGoogleWatchState(userId)).resolves.toEqual(
      expect.objectContaining({
        status: GoogleWatchStateStatus.FULL_REPAIR_REQUIRED,
        reason: "SYNC_RECORD_MISSING",
      }),
    );
  });
});
