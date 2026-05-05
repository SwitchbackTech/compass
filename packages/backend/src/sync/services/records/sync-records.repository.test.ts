import { Resource_Sync } from "@core/types/sync.types";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";
import syncRecords from "./sync-records.repository";

describe("syncRecords", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  it("deletes all sync records for one user only", async () => {
    const firstUser = await UserDriver.createUser();
    const secondUser = await UserDriver.createUser();

    await mongoService.sync.insertMany([
      {
        user: firstUser._id.toString(),
        google: { events: [{ gCalendarId: "primary", nextSyncToken: "a" }] },
      },
      {
        user: secondUser._id.toString(),
        google: { events: [{ gCalendarId: "primary", nextSyncToken: "b" }] },
      },
    ]);

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

    await mongoService.sync.insertMany([
      {
        user: firstUser._id.toString(),
        google: { events: [{ gCalendarId: "shared", nextSyncToken: "a" }] },
      },
      {
        user: secondUser._id.toString(),
        google: { events: [{ gCalendarId: "other", nextSyncToken: "b" }] },
      },
    ]);

    const result = await syncRecords.deleteAllByGcalId("shared");

    expect(result.deletedCount).toBe(1);
    expect(
      await mongoService.sync.findOne({ user: firstUser._id.toString() }),
    ).toBeNull();
    expect(
      await mongoService.sync.findOne({ user: secondUser._id.toString() }),
    ).toEqual(expect.objectContaining({ user: secondUser._id.toString() }));
  });

  it("removes Google sync data without deleting the sync record", async () => {
    const user = await UserDriver.createUser();

    await mongoService.sync.insertOne({
      user: user._id.toString(),
      google: {
        events: [{ gCalendarId: "primary", nextSyncToken: "token" }],
        calendarlist: [
          {
            gCalendarId: Resource_Sync.CALENDAR,
            nextSyncToken: "calendar-token",
          },
        ],
      },
    });

    const result = await syncRecords.deleteByIntegration(
      "google",
      user._id.toString(),
    );

    expect(result.modifiedCount).toBe(1);
    expect(
      await mongoService.sync.findOne({ user: user._id.toString() }),
    ).toEqual(expect.not.objectContaining({ google: expect.anything() }));
  });
});
