import { CalendarProvider } from "@core/types/event.types";
import { Resource_Sync } from "@core/types/sync.types";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import { updateSync } from "@backend/sync/util/sync.queries";
import syncRecords from "./sync.records";

describe("syncRecords", () => {
  beforeEach(async () => {
    await setupTestDb();
    await cleanupCollections();
  });
  afterAll(cleanupTestDb);

  it("deletes sync records for one user", async () => {
    const firstUser = await UserDriver.createUser();
    const secondUser = await UserDriver.createUser();

    await updateSync(Resource_Sync.EVENTS, firstUser._id.toString(), "primary");
    await updateSync(
      Resource_Sync.EVENTS,
      secondUser._id.toString(),
      "primary",
    );

    const result = await syncRecords.deleteAllByUser(firstUser._id.toString());

    expect(result.deletedCount).toBe(1);
    expect(
      await mongoService.sync.findOne({ user: firstUser._id.toString() }),
    ).toBeNull();
    expect(
      await mongoService.sync.findOne({ user: secondUser._id.toString() }),
    ).toEqual(expect.objectContaining({ user: secondUser._id.toString() }));
  });

  it("deletes sync records that reference a Google calendar id", async () => {
    const firstUser = await UserDriver.createUser();
    const secondUser = await UserDriver.createUser();
    const calendarId = "shared-calendar";

    await updateSync(
      Resource_Sync.EVENTS,
      firstUser._id.toString(),
      calendarId,
    );
    await updateSync(Resource_Sync.EVENTS, secondUser._id.toString(), "other");

    const result = await syncRecords.deleteAllByGcalId(calendarId);

    expect(result.deletedCount).toBe(1);
    expect(
      await mongoService.sync.findOne({ user: firstUser._id.toString() }),
    ).toBeNull();
    expect(
      await mongoService.sync.findOne({ user: secondUser._id.toString() }),
    ).toEqual(expect.objectContaining({ user: secondUser._id.toString() }));
  });

  it("removes one integration from a user's sync record", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();

    await updateSync(Resource_Sync.EVENTS, userId, "primary");

    const result = await syncRecords.deleteByIntegration(
      CalendarProvider.GOOGLE,
      userId,
    );

    expect(result.modifiedCount).toBe(1);
    expect(
      await mongoService.sync.findOne({ user: userId }),
    ).not.toHaveProperty(CalendarProvider.GOOGLE);
  });
});
