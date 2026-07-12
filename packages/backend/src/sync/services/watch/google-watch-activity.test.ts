import dayjs from "@core/util/date/dayjs";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";
import { hasUserBeenActiveSince } from "@backend/sync/services/watch/google-watch-activity";

describe("hasUserBeenActiveSince", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  const deadline = dayjs().subtract(14, "days").format();

  it("is active when lastSeenAt is after the deadline", async () => {
    const user = await UserDriver.createUser();
    await mongoService.user.updateOne(
      { _id: user._id },
      { $set: { lastSeenAt: new Date() } },
    );

    await expect(
      hasUserBeenActiveSince(user._id.toString(), deadline),
    ).resolves.toBe(true);
  });

  it("is active when only lastLoggedInAt is after the deadline", async () => {
    const user = await UserDriver.createUser();
    await mongoService.user.updateOne(
      { _id: user._id },
      { $set: { lastLoggedInAt: new Date() } },
    );

    await expect(
      hasUserBeenActiveSince(user._id.toString(), deadline),
    ).resolves.toBe(true);
  });

  it("is inactive when both lastSeenAt and lastLoggedInAt are stale", async () => {
    const user = await UserDriver.createUser();
    const staleDate = dayjs().subtract(30, "days").toDate();
    await mongoService.user.updateOne(
      { _id: user._id },
      { $set: { lastSeenAt: staleDate, lastLoggedInAt: staleDate } },
    );

    await expect(
      hasUserBeenActiveSince(user._id.toString(), deadline),
    ).resolves.toBe(false);
  });

  it("is inactive when both lastSeenAt and lastLoggedInAt are missing", async () => {
    const user = await UserDriver.createUser();

    await expect(
      hasUserBeenActiveSince(user._id.toString(), deadline),
    ).resolves.toBe(false);
  });

  it("is inactive when the user no longer exists", async () => {
    await expect(
      hasUserBeenActiveSince("507f1f77bcf86cd799439011", deadline),
    ).resolves.toBe(false);
  });
});
