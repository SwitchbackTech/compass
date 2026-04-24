import { faker } from "@faker-js/faker";
import { ObjectId } from "mongodb";
import { WatchSchema } from "@core/types/watch.types";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { createGoogleError } from "@backend/__tests__/mocks.gcal/errors/error.google.factory";
import { invalidGrant400Error } from "@backend/__tests__/mocks.gcal/errors/error.google.invalidGrant";
import { missingRefreshTokenError } from "@backend/__tests__/mocks.gcal/errors/error.missingRefreshToken";
import * as googleCalendarClient from "@backend/auth/services/google/clients/google.calendar.client";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
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

describe("SyncWatchService", () => {
  beforeAll(initSupertokens);
  beforeEach(async () => {
    await setupTestDb();
    await cleanupCollections();
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(cleanupTestDb);

  it("deletes only the target user's watch records and returns identities", async () => {
    const firstUser = await UserDriver.createUser();
    const secondUser = await UserDriver.createUser();
    const firstUserWatch = await createWatch(firstUser._id.toString());
    const secondUserWatch = await createWatch(secondUser._id.toString());

    const deleted = await syncWatchService.deleteWatchesByUser(
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
      syncWatchService.stopWatch(
        user._id.toString(),
        watch._id.toString(),
        watch.resourceId,
      ),
    ).resolves.toBeUndefined();

    expect(await mongoService.watch.findOne({ _id: watch._id })).toBeNull();
  });

  it("deletes the local watch record when the user is missing a refresh token", async () => {
    const user = await UserDriver.createUser({ withGoogleRefreshToken: false });
    const watch = await createWatch(user._id.toString());

    jest
      .spyOn(gcalService, "stopWatch")
      .mockRejectedValue(missingRefreshTokenError);

    await expect(
      syncWatchService.stopWatch(
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
      syncWatchService.stopWatch(
        user._id.toString(),
        watch._id.toString(),
        watch.resourceId,
      ),
    ).rejects.toMatchObject({ code: "500" });

    expect(await mongoService.watch.findOne({ _id: watch._id })).toEqual(
      expect.objectContaining({ user: user._id.toString() }),
    );
  });

  it("does not fetch a Google client when a user has no stored watches", async () => {
    const user = await UserDriver.createUser({ withGoogle: false });
    const getGcalClientSpy = jest.spyOn(googleCalendarClient, "getGcalClient");

    await expect(
      syncWatchService.stopWatches(user._id.toString()),
    ).resolves.toEqual([]);

    expect(getGcalClientSpy).not.toHaveBeenCalled();
  });
});
