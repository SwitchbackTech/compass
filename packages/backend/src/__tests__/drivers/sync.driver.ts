import { WithId } from "mongodb";
import { faker } from "@faker-js/faker";
import { Resource_Sync } from "@core/types/sync.types";
import { Schema_User } from "@core/types/user.types";
import { updateSync } from "@backend/sync/util/sync.queries";

export class SyncDriver {
  static async createSync(
    user: Pick<WithId<Schema_User>, "_id">,
    defaultUser = false,
  ): Promise<void> {
    const gCalendarId = defaultUser ? "test-calendar" : faker.string.uuid();

    await Promise.all([
      updateSync(Resource_Sync.CALENDAR, user._id.toString(), gCalendarId, {
        nextSyncToken: faker.string.ulid(),
      }),
      updateSync(Resource_Sync.EVENTS, user._id.toString(), gCalendarId, {
        nextSyncToken: faker.string.ulid(),
        resourceId: faker.string.nanoid(),
        channelId: faker.string.uuid(),
        expiration: new Date(Date.now() + 3600000).toISOString(),
      }),
    ]);
  }
}
