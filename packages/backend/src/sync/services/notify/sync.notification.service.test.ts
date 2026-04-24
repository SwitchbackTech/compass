import { faker } from "@faker-js/faker";
import { ObjectId } from "mongodb";
import { Resource_Sync, XGoogleResourceState } from "@core/types/sync.types";
import { WatchSchema } from "@core/types/watch.types";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";
import syncNotificationService from "@backend/sync/services/notify/sync.notification.service";
import syncWatchService from "@backend/sync/services/watch/sync.watch.service";

const createWatch = async (user: string) => {
  const watch = WatchSchema.parse({
    _id: new ObjectId(),
    user,
    resourceId: faker.string.uuid(),
    expiration: new Date(Date.now() + 60_000),
    gCalendarId: faker.string.uuid(),
    createdAt: new Date(),
  });

  await mongoService.watch.insertOne(watch);

  return watch;
};

describe("SyncNotificationService", () => {
  beforeAll(initSupertokens);
  beforeEach(async () => {
    await setupTestDb();
    await cleanupCollections();
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(cleanupTestDb);

  it("returns INITIALIZED for Google sync handshake notifications", async () => {
    await expect(
      syncNotificationService.handleGcalNotification({
        resource: Resource_Sync.EVENTS,
        channelId: new ObjectId(),
        resourceId: faker.string.uuid(),
        resourceState: XGoogleResourceState.SYNC,
        expiration: faker.date.future(),
      }),
    ).resolves.toBe("INITIALIZED");
  });

  it("returns IGNORED when no matching active watch exists", async () => {
    await expect(
      syncNotificationService.handleGcalNotification({
        resource: Resource_Sync.EVENTS,
        channelId: new ObjectId(),
        resourceId: faker.string.uuid(),
        resourceState: XGoogleResourceState.EXISTS,
        expiration: faker.date.future(),
      }),
    ).resolves.toBe("IGNORED");
  });

  it("cleans up an exact stale watch and returns true", async () => {
    const user = await UserDriver.createUser();
    const watch = await createWatch(user._id.toString());
    const stopWatchSpy = jest
      .spyOn(syncWatchService, "stopWatch")
      .mockResolvedValue({
        channelId: watch._id.toString(),
        resourceId: watch.resourceId,
      });

    await expect(
      syncNotificationService.cleanupStaleWatchChannel({
        resource: Resource_Sync.EVENTS,
        channelId: watch._id,
        resourceId: watch.resourceId,
        resourceState: XGoogleResourceState.EXISTS,
        expiration: faker.date.future(),
      }),
    ).resolves.toBe(true);

    expect(stopWatchSpy).toHaveBeenCalledWith(
      user._id.toString(),
      watch._id.toString(),
      watch.resourceId,
    );
  });
});
