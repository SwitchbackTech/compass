import { ObjectId, WithId } from "mongodb";
import { faker } from "@faker-js/faker";
import { Schema_Sync } from "@core/types/sync.types";
import { Schema_User } from "@core/types/user.types";
import { SyncDriver } from "@backend/__tests__/drivers/sync.driver";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { WaitListDriver } from "@backend/__tests__/drivers/waitlist.driver";
import mongoService from "@backend/common/services/mongo.service";

export class UtilDriver {
  static async setupTestUser(): Promise<{ user: WithId<Schema_User> }> {
    const user = await UserDriver.createUser();

    await Promise.all([
      SyncDriver.createSync(user, true),
      WaitListDriver.saveWaitListRecord(
        WaitListDriver.createWaitListRecord(user),
      ),
    ]);

    return { user };
  }

  static async generateV0SyncData(
    numUsers = 3,
  ): Promise<Array<WithId<Omit<Schema_Sync, "_id">>>> {
    const users = await Promise.all(
      Array.from({ length: numUsers }, UserDriver.createUser),
    );

    const data = users.map((user) => ({
      _id: new ObjectId(),
      user: user._id.toString(),
      google: {
        events: [
          {
            resourceId: faker.string.ulid(),
            gCalendarId: user.email,
            lastSyncedAt: faker.date.past(),
            nextSyncToken: faker.string.alphanumeric(32),
            channelId: faker.string.uuid(),
            expiration: faker.date.future().getTime().toString(),
          },
        ],
        calendarlist: [
          {
            nextSyncToken: faker.string.alphanumeric(32),
            gCalendarId: user.email,
            lastSyncedAt: faker.date.past(),
          },
        ],
      },
    }));

    return mongoService.sync.insertMany(data).then(() => data);
  }
}
