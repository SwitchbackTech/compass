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
import { createGoogleError } from "@backend/__tests__/mocks.gcal/errors/error.google.factory";
import { invalidGrant400Error } from "@backend/__tests__/mocks.gcal/errors/error.google.invalidGrant";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { googleWatchService } from "@backend/sync/services/watch/google-watch.service";
import { isUsingGcalWebhookHttps } from "@backend/sync/util/sync.util";

jest.mock("@backend/sync/util/sync.util", () => {
  const actual = jest.requireActual("@backend/sync/util/sync.util");
  return {
    ...actual,
    isUsingGcalWebhookHttps: jest.fn(() => actual.isUsingGcalWebhookHttps()),
  };
});

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

describe("googleWatchService", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterEach(() => jest.restoreAllMocks());
  afterAll(cleanupTestDb);

  it("deletes only the target user's watch records and returns their identities", async () => {
    const firstUser = await UserDriver.createUser();
    const secondUser = await UserDriver.createUser();
    const firstUserWatch = await createWatch(firstUser._id.toString());
    const secondUserWatch = await createWatch(secondUser._id.toString());

    const deleted = await googleWatchService.deleteWatchesByUser(
      firstUser._id.toString(),
    );

    expect(deleted).toEqual([
      {
        channelId: firstUserWatch._id.toString(),
        resourceId: firstUserWatch.resourceId,
      },
    ]);
    expect(
      await mongoService.watch.findOne({ _id: firstUserWatch._id }),
    ).toBeNull();
    expect(
      await mongoService.watch.findOne({ _id: secondUserWatch._id }),
    ).toEqual(expect.objectContaining({ user: secondUser._id.toString() }));
  });

  it("deletes the local watch record when Google returns invalid_grant", async () => {
    const user = await UserDriver.createUser();
    const watch = await createWatch(user._id.toString());

    jest
      .spyOn(gcalService, "stopWatch")
      .mockRejectedValue(invalidGrant400Error);

    await expect(
      googleWatchService.stopWatch(
        user._id.toString(),
        watch._id.toString(),
        watch.resourceId,
      ),
    ).resolves.toBeUndefined();

    expect(await mongoService.watch.findOne({ _id: watch._id })).toBeNull();
  });

  it("rethrows unexpected Google stop errors and keeps the local watch", async () => {
    const user = await UserDriver.createUser();
    const watch = await createWatch(user._id.toString());

    jest
      .spyOn(gcalService, "stopWatch")
      .mockRejectedValue(
        createGoogleError({ code: "500", responseStatus: 500 }),
      );

    await expect(
      googleWatchService.stopWatch(
        user._id.toString(),
        watch._id.toString(),
        watch.resourceId,
      ),
    ).rejects.toMatchObject({ code: "500" });

    expect(await mongoService.watch.findOne({ _id: watch._id })).toEqual(
      expect.objectContaining({ user: user._id.toString() }),
    );
  });

  it("ignores expired notifications when no local watch record remains", async () => {
    const cleanupSpy = jest
      .spyOn(googleWatchService, "cleanupStaleWatch")
      .mockResolvedValue(false);

    await expect(
      googleWatchService.handleGoogleWatchNotification({
        resource: Resource_Sync.EVENTS,
        channelId: new ObjectId(),
        resourceId: faker.string.uuid(),
        resourceState: XGoogleResourceState.EXISTS,
        expiration: faker.date.future(),
      }),
    ).resolves.toBe("IGNORED");

    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });

  it("skips direct Google watch setup when the Google webhook URL is not HTTPS", async () => {
    (isUsingGcalWebhookHttps as jest.Mock).mockReturnValue(false);
    const startCalendarWatchSpy = jest.spyOn(
      googleWatchService,
      "startCalendarListWatch",
    );
    const startEventWatchSpy = jest.spyOn(
      googleWatchService,
      "startEventWatch",
    );

    await expect(
      googleWatchService.startGoogleWatches(
        "507f1f77bcf86cd799439011",
        [{ gCalendarId: Resource_Sync.CALENDAR }, { gCalendarId: "primary" }],
        {} as never,
      ),
    ).resolves.toEqual([]);

    expect(startCalendarWatchSpy).not.toHaveBeenCalled();
    expect(startEventWatchSpy).not.toHaveBeenCalled();
  });
});
