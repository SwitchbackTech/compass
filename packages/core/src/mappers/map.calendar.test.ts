import { ObjectId } from "bson";
import { createMockCalendarListEntry } from "@core/__tests__/helpers/gcal.factory";
import { MapCalendar } from "@core/mappers/map.calendar";
import { CalendarProvider } from "@core/types/event.types";
import { gSchema$CalendarListEntry } from "@core/types/gcal";

describe("MapCalendar.gcalToCompass", () => {
  const baseGoogleCalendar: gSchema$CalendarListEntry =
    createMockCalendarListEntry();

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
