import { WithId } from "mongodb";
import { faker } from "@faker-js/faker";
import { Schema_User } from "@core/types/user.types";
import mongoService from "@backend/common/services/mongo.service";
import { Schema_Sync } from "../../../../core/src/types/sync.types";

export class SyncDriver {
  static async createSync(
    user: Pick<WithId<Schema_User>, "_id">,
    defaultUser = false,
  ): Promise<WithId<Schema_Sync>> {
    const gCalendarId = defaultUser ? "test-calendar" : faker.string.uuid();
    const nextSyncToken = faker.internet.jwt();

    const syncRecord: Schema_Sync = {
      user: user._id.toString(),
      google: {
        calendarlist: [
          {
            gCalendarId,
            nextSyncToken,
            lastSyncedAt: new Date(),
          },
        ],
        events: [
          {
            gCalendarId,
            resourceId: faker.string.nanoid(),
            channelId: faker.string.uuid(),
            expiration: new Date(Date.now() + 3600000).toISOString(),
            nextSyncToken,
          },
        ],
      },
    };

    const created = await mongoService.sync.insertOne(syncRecord);

    return { _id: created.insertedId, ...syncRecord };
  }
}
