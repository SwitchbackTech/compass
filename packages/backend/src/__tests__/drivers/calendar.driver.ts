import { ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";
import { gSchema$CalendarListEntry } from "@core/types/gcal";
import { StringV4Schema } from "@core/types/type.utils";
import { generateCalendarColorScheme } from "@core/util/color.utils";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { CompassGCalCalendarTestState } from "@backend/__tests__/helpers/mock.setup";
import { mockAndCategorizeGcalEvents } from "@backend/__tests__/mocks.gcal/factories/gcal.event.batch";
import calendarService from "@backend/calendar/services/calendar.service";
import { IS_DEV } from "@backend/common/constants/env.constants";
import mongoService from "@backend/common/services/mongo.service";

export class CalendarDriver {
  /**
   * Generates a mock Google Calendar calendar entry for a user.
   * The calendar is added to the user's mocked google calendars
   */
  static createGCalCalendarListEntry(
    overrides: Partial<gSchema$CalendarListEntry> = {},
  ): gSchema$CalendarListEntry {
    const { backgroundColor, color } = generateCalendarColorScheme();

    const calendar = {
      kind: "calendar#calendarListEntry",
      id: faker.string.ulid(),
      primary: false,
      etag: faker.number.hex({ min: 16, max: 16 }).toString(),
      summary: faker.book.title(),
      description: faker.lorem.paragraph({ min: 1, max: 3 }),
      timeZone: faker.location.timeZone(),
      colorId: faker.number.int({ min: 1, max: 24 }).toString(),
      backgroundColor,
      foregroundColor: color,
      selected: true,
      accessRole: faker.helpers.arrayElement(["reader", "writer", "owner"]),
      defaultReminders: [],
      conferenceProperties: {
        allowedConferenceSolutionTypes: faker.helpers.arrayElements(
          ["hangoutsMeet", "eventHangout", "eventNamedHangout"],
          { min: 1, max: 3 },
        ),
      },
      ...overrides,
    };

    return calendar;
  }

  static createCalendarTestState(): Array<
    [string, CompassGCalCalendarTestState]
  > {
    return Array.from(
      { length: faker.number.int({ min: 2, max: 5 }) },
      (_, index) => {
        const events = mockAndCategorizeGcalEvents().gcalEvents.all;
        const calendar = CalendarDriver.createGCalCalendarListEntry({
          primary: index === 0,
        });

        return [StringV4Schema.parse(calendar.id), { calendar, events }];
      },
    );
  }

  static async generateV0Data(numUsers = 3) {
    const users = await UserDriver.createUsers(numUsers);

    const data = await Promise.all(
      users.map(async (user) => {
        const calendars = await calendarService.getAllByUser(user._id);

        return {
          _id: new ObjectId(),
          user: user._id.toString(),
          google: {
            items: calendars.map((calendar) =>
              CalendarDriver.createGCalCalendarListEntry({
                ...calendar.metadata,
                backgroundColor: calendar.backgroundColor,
                foregroundColor: calendar.color,
                timeZone: calendar.timezone,
                summaryOverride: calendar.primary
                  ? `${user.firstName} ${user.lastName}`
                  : null,
              }),
            ),
          },
        };
      }),
    );

    const calendarListCollection = mongoService.db.collection<
      (typeof data)[number]
    >(IS_DEV ? "_dev.calendarlist" : "calendarlist");

    const calendars = await calendarListCollection
      .insertMany(data)
      .then(() => data);

    return calendars;
  }
}
