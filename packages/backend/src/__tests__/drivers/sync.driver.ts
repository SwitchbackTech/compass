import { ObjectId, WithId } from "mongodb";
import { faker } from "@faker-js/faker";
import { Resource_Sync, Schema_Sync } from "@core/types/sync.types";
import { Schema_User } from "@core/types/user.types";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import mongoService from "@backend/common/services/mongo.service";
import syncService from "@backend/sync/services/sync.service";
import { updateSync } from "@backend/sync/util/sync.queries";

export class SyncDriver {
  static async createSync(
    user: Pick<WithId<Schema_User>, "_id">,
    defaultUser = false,
  ): Promise<void> {
    const gCalendarId = defaultUser ? "test-calendar" : faker.string.uuid();
    const gcal = await getGcalClient(user._id.toString());

    await Promise.all([
      updateSync(Resource_Sync.CALENDAR, user._id.toString(), gCalendarId, {
        nextSyncToken: faker.string.ulid(),
      }),
      updateSync(Resource_Sync.EVENTS, user._id.toString(), gCalendarId, {
        nextSyncToken: faker.string.ulid(),
      }),
      syncService.startWatchingGcalResources(
        user._id.toString(),
        [{ gCalendarId }, { gCalendarId: Resource_Sync.CALENDAR }], // Watch all selected calendars and calendar list
        gcal,
      ),
    ]);
  }

  static async generateV0Data(
    numUsers = 3,
    generateExpiredWatches = false,
  ): Promise<Array<WithId<Omit<Schema_Sync, "_id">>>> {
    const users = await UserDriver.createUsers(numUsers);

    const futureOrPastProbability = generateExpiredWatches
      ? faker.number.float({ min: 0, max: 1 })
      : 1;

    const data = users.map((user) => ({
      _id: new ObjectId(),
      user: user._id.toString(),
      google: {
        events: Array.from(
          { length: faker.number.int({ min: 1, max: 5 }) },
          (_, index) => ({
            resourceId: faker.string.ulid(),
            gCalendarId: index === 0 ? user.email : faker.string.ulid(),
            lastSyncedAt: faker.date.past(),
            nextSyncToken: faker.string.alphanumeric(32),
            channelId: faker.string.uuid(),
            expiration: faker.datatype.boolean(futureOrPastProbability)
              ? faker.date.future().getTime().toString()
              : faker.date.past().getTime().toString(),
          }),
        ),
        calendarlist: [
          {
            nextSyncToken: faker.string.alphanumeric(32),
            gCalendarId: user.email,
            lastSyncedAt: faker.date.past(),
          },
        ],
      },
    }));

    const sync = await mongoService.sync.insertMany(data).then(() => data);

    return sync;
  }
}
