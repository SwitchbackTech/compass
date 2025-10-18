import { ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";
import { createMockCalendarListEntry } from "@core/__tests__/helpers/gcal.factory";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { IS_DEV } from "@backend/common/constants/env.constants";
import mongoService from "@backend/common/services/mongo.service";

export class CalendarDriver {
  static async generateV0Data(numUsers = 3) {
    const users = await UserDriver.createUsers(numUsers);

    const data = users.map((user) => ({
      _id: new ObjectId(),
      user: user._id.toString(),
      google: {
        items: Array.from(
          { length: faker.number.int({ min: 1, max: 5 }) },
          (_, index) =>
            createMockCalendarListEntry({
              id: index === 0 ? user.email : faker.string.ulid(),
              primary: index === 0,
              summaryOverride:
                index === 0 ? `${user.firstName} ${user.lastName}` : null,
            }),
        ),
      },
    }));

    const calendarListCollection = mongoService.db.collection<
      (typeof data)[number]
    >(IS_DEV ? "_dev.calendarlist" : "calendarlist");

    const calendars = await calendarListCollection
      .insertMany(data)
      .then(() => data);

    return calendars;
  }
}
