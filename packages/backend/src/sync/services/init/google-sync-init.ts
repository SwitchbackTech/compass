import { StringV4Schema } from "@core/types/type.utils";
import { type GoogleRequestContext } from "@backend/common/services/gcal/gcal.context";
import gcalService from "@backend/common/services/gcal/gcal.service";

export const getCalendarsToSync = async (context: GoogleRequestContext) => {
  const calendarListResponse = await gcalService.getCalendarlist(context);
  const { items = [], nextPageToken } = calendarListResponse;

  const nextSyncToken = StringV4Schema.parse(
    calendarListResponse.nextSyncToken,
    { error: () => "Failed to get Calendar(list)s to sync" },
  );

  const primaryGcal = items.find(({ primary }) => primary);

  const calendars = primaryGcal ? [primaryGcal] : [];

  const gCalendarIds = calendars
    .map(({ id }) => id)
    .filter((id): id is string => id !== undefined && id !== null);

  return {
    calendars,
    gCalendarIds,
    nextSyncToken,
    nextPageToken,
  };
};
