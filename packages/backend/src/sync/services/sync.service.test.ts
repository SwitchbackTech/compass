import { ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";
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
import { missingRefreshTokenError } from "@backend/__tests__/mocks.gcal/errors/error.missingRefreshToken";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import syncService from "@backend/sync/services/sync.service";
import userMetadataService from "@backend/user/services/user-metadata.service";

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

describe("SyncService", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterEach(() => jest.restoreAllMocks());
  afterAll(cleanupTestDb);

  describe("deleteWatchesByUser", () => {
    it("deletes only the target user's watch records and returns their identities", async () => {
      const firstUser = await UserDriver.createUser();
      const secondUser = await UserDriver.createUser();
      const firstUserWatchA = await createWatch(firstUser._id.toString());
      const firstUserWatchB = await createWatch(firstUser._id.toString());
      const secondUserWatch = await createWatch(secondUser._id.toString());

      const deleted = await syncService.deleteWatchesByUser(
        firstUser._id.toString(),
      );

      expect(deleted).toEqual(
        expect.arrayContaining([
          {
            channelId: firstUserWatchA._id.toString(),
            resourceId: firstUserWatchA.resourceId,
          },
          {
            channelId: firstUserWatchB._id.toString(),
            resourceId: firstUserWatchB.resourceId,
          },
        ]),
      );
      expect(deleted).toHaveLength(2);
      expect(
        await mongoService.watch.countDocuments({
          user: firstUser._id.toString(),
        }),
      ).toBe(0);
      expect(
        await mongoService.watch.findOne({ _id: secondUserWatch._id }),
      ).toEqual(expect.objectContaining({ user: secondUser._id.toString() }));
    });
  });

  describe("stopWatch", () => {
    it("deletes the local watch record when Google returns 401", async () => {
      const user = await UserDriver.createUser();
      const watch = await createWatch(user._id.toString());

      jest
        .spyOn(gcalService, "stopWatch")
        .mockRejectedValue(
          createGoogleError({ code: "401", responseStatus: 401 }),
        );

      await expect(
        syncService.stopWatch(
          user._id.toString(),
          watch._id.toString(),
          watch.resourceId,
        ),
      ).resolves.toBeUndefined();

      expect(await mongoService.watch.findOne({ _id: watch._id })).toBeNull();
    });

    it("deletes the local watch record when Google returns invalid_grant", async () => {
      const user = await UserDriver.createUser();
      const watch = await createWatch(user._id.toString());

      jest
        .spyOn(gcalService, "stopWatch")
        .mockRejectedValue(invalidGrant400Error);

      await expect(
        syncService.stopWatch(
          user._id.toString(),
          watch._id.toString(),
          watch.resourceId,
        ),
      ).resolves.toBeUndefined();

      expect(await mongoService.watch.findOne({ _id: watch._id })).toBeNull();
    });

    it("deletes the local watch record when the user is missing a refresh token", async () => {
      const user = await UserDriver.createUser({
        withGoogleRefreshToken: false,
      });
      const watch = await createWatch(user._id.toString());

      jest
        .spyOn(gcalService, "stopWatch")
        .mockRejectedValue(missingRefreshTokenError);

      await expect(
        syncService.stopWatch(
          user._id.toString(),
          watch._id.toString(),
          watch.resourceId,
        ),
      ).resolves.toBeUndefined();

      expect(await mongoService.watch.findOne({ _id: watch._id })).toBeNull();
    });

    it("preserves the existing delete behavior when Google returns 404", async () => {
      const user = await UserDriver.createUser();
      const watch = await createWatch(user._id.toString());

      jest
        .spyOn(gcalService, "stopWatch")
        .mockRejectedValue(
          createGoogleError({ code: "404", responseStatus: 404 }),
        );

      await expect(
        syncService.stopWatch(
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
        syncService.stopWatch(
          user._id.toString(),
          watch._id.toString(),
          watch.resourceId,
        ),
      ).rejects.toMatchObject({ code: "500" });

      expect(
        await mongoService.watch.findOne({
          _id: watch._id,
          resourceId: watch.resourceId,
        }),
      ).toEqual(expect.objectContaining({ user: user._id.toString() }));
    });
  });

  describe("handleGcalNotification", () => {
    it("ignores expired notifications when no local watch record remains", async () => {
      const cleanupSpy = jest
        .spyOn(syncService, "cleanupStaleWatchChannel")
        .mockResolvedValue(false);

      await expect(
        syncService.handleGcalNotification({
          resource: Resource_Sync.EVENTS,
          channelId: new ObjectId().toString(),
          resourceId: faker.string.uuid(),
          resourceState: XGoogleResourceState.EXISTS,
          expiration: faker.date.future(),
        }),
      ).resolves.toBe("IGNORED");

      expect(cleanupSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("cleanupStaleWatchChannel", () => {
    it("returns deletion result even when metadata assessment fails", async () => {
      const user = await UserDriver.createUser();
      const watch = await createWatch(user._id.toString());

      jest.spyOn(syncService, "stopWatch").mockResolvedValue({
        channelId: watch._id.toString(),
        resourceId: watch.resourceId,
      });
      jest
        .spyOn(userMetadataService, "assessGoogleMetadata")
        .mockRejectedValue(new Error("metadata assessment failed"));

      await expect(
        syncService.cleanupStaleWatchChannel({
          resource: Resource_Sync.EVENTS,
          channelId: watch._id.toString(),
          resourceId: watch.resourceId,
          resourceState: XGoogleResourceState.EXISTS,
          expiration: faker.date.future(),
        }),
      ).resolves.toBe(true);
    });
  });
});
