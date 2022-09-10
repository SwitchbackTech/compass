import { Credentials } from "google-auth-library";
import { gSchema$CalendarListEntry } from "@core/types/gcal";
import { MapCalendarList } from "@core/mappers/map.calendarlist";
import { gCalendar, gSchema$CalendarList } from "@core/types/gcal";
import { Schema_CalendarList } from "@core/types/calendar.types";
import GoogleAuthService from "@backend/auth/services/google.auth.service";
import {
  error,
  AuthError,
  GcalError,
} from "@backend/common/errors/types/backend.errors";
import gcalService from "@backend/common/services/gcal/gcal.service";

export const getCalendarsToSync = async (userId: string, gcal: gCalendar) => {
  const { items, nextSyncToken } = await gcalService.getCalendarlist(gcal);
  if (!nextSyncToken) {
    throw error(GcalError.NoSyncToken, "Failed to Get Cals to Sync");
  }

  const gCalendarList = items as gSchema$CalendarListEntry[];

  // filter out everything but primary cal for now
  const primaryGcal = gCalendarList.filter((c) => {
    return c.primary === true;
  })[0] as gSchema$CalendarList;

  const _ccalList = MapCalendarList.toCompass(primaryGcal);
  const cCalendarList = { ..._ccalList, user: userId } as Schema_CalendarList;

  const gCalendarIds = cCalendarList.google.items.map(
    (gcal) => gcal.id
  ) as string[];

  return {
    cCalendarList,
    gCalendarIds,
    nextSyncToken,
  };
};

export const initGoogleClient = async (
  gAuthClient: GoogleAuthService,
  tokens: Credentials
) => {
  const gRefreshToken = tokens.refresh_token;
  if (!gRefreshToken) {
    throw error(AuthError.MissingRefreshToken, "Failed to auth to user's gCal");
  }

  gAuthClient.oauthClient.setCredentials(tokens);

  const { gUser } = await gAuthClient.getGoogleUserInfo();

  const gcalClient = gAuthClient.getGcalClient();

  return { gUser, gcalClient, gRefreshToken };
};
