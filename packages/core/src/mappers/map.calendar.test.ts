import { ObjectId } from "bson";
import { faker } from "@faker-js/faker";
import { MapCalendar } from "@core/mappers/map.calendar";
import { CalendarProvider } from "@core/types/calendar.types";
import { generateCalendarColorScheme } from "../util/color.utils";

describe("MapCalendar.gcalToCompass", () => {
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
  };

  it("maps provided google calendar fields correctly", () => {
    const userId = new ObjectId();
    const result = MapCalendar.gcalToCompass(userId, calendar);

    expect(result).toEqual(
      expect.objectContaining({
        _id: expect.any(ObjectId),
        user: userId,
        backgroundColor: expect.any(String),
        color: expect.any(String),
        selected: expect.any(Boolean),
        primary: expect.any(Boolean),
        timezone: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        metadata: expect.objectContaining({
          provider: CalendarProvider.GOOGLE,
          id: calendar.id,
          summary: calendar.summary,
        }),
      }),
    );
  });
});
