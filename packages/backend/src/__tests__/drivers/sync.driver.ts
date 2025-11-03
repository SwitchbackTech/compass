import { ObjectId, WithId } from "mongodb";
import { faker } from "@faker-js/faker";
import { Schema_Sync } from "@core/types/sync.types";
import dayjs from "@core/util/date/dayjs";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import mongoService from "@backend/common/services/mongo.service";

export class SyncDriver {
  static async generateV0Data(
    numUsers = 3,
    generateExpiredWatches = false,
  ): Promise<Array<WithId<Omit<Schema_Sync, "_id">>>> {
    const users = await AuthDriver.signUpGoogleUsers(numUsers);
    const minProbability = generateExpiredWatches ? 0 : 1;
    const probability = faker.number.float({ min: minProbability, max: 1 });
    const futureOrPastProbability = parseFloat(probability.toFixed(2));

    await mongoService.sync.deleteMany();

    const data = users.map((user) => ({
      _id: new ObjectId(),
      user: user._id.toString(),
      google: {
        events: Array.from(
          { length: faker.number.int({ min: 1, max: 5 }) },
          (_, index) => {
            const expired = faker.datatype.boolean(futureOrPastProbability);
            const period = faker.number.int({ min: 1, max: 31 });
            const action = expired ? "subtract" : "add";

            return {
              resourceId: faker.string.ulid(),
              gCalendarId: index === 0 ? user.email : faker.string.ulid(),
              lastSyncedAt: faker.date.past(),
              nextSyncToken: faker.string.alphanumeric(32),
              channelId: faker.string.uuid(),
              expiration: dayjs()[action](period, "days").valueOf().toString(),
            };
          },
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
