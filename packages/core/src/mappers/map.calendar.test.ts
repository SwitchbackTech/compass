import { ObjectId } from "bson";
import { MapCalendar } from "@core/mappers/map.calendar";
import { CalendarProvider } from "@core/types/calendar.types";
import { gSchema$CalendarListEntry } from "@core/types/gcal";
import { CalendarDriver } from "@backend/__tests__/drivers/calendar.driver";

describe("MapCalendar.gcalToCompass", () => {
  const baseGoogleCalendar: gSchema$CalendarListEntry =
    CalendarDriver.createGCalCalendarListEntry(new ObjectId());

  it("maps provided google calendar fields correctly", () => {
    const userId = new ObjectId();
    const result = MapCalendar.gcalToCompass(userId, baseGoogleCalendar);

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
          id: baseGoogleCalendar.id,
          summary: baseGoogleCalendar.summary,
        }),
      }),
    );
  });
});
