import { gCalendar } from "@core/types/gcal";
import { StringV4Schema } from "@core/types/type.utils";
import gcalService from "@backend/common/services/gcal/gcal.service";

export const getCalendarsToSync = async (gcal: gCalendar) => {
  const calendarListResponse = await gcalService.getCalendarlist(gcal);
  const { items = [], nextPageToken } = calendarListResponse;

  const nextSyncToken = StringV4Schema.parse(
    calendarListResponse.nextSyncToken,
    { error: () => "Failed to get Calendar(list)s to sync" },
  );

  const primaryGcal = items.find(({ primary }) => primary);

  const calendars = primaryGcal ? [primaryGcal] : [];

  const gCalendarIds = calendars
    .map(({ id }) => id)
    .filter((id) => id !== undefined && id !== null);

  return {
    calendars,
    gCalendarIds,
    nextSyncToken,
    nextPageToken,
  };
};
