import { Credentials } from "google-auth-library";
import { MapCalendarList } from "@core/mappers/map.calendarlist";
import { gCalendar, gSchema$CalendarList } from "@core/types/gcal";
import { Schema_CalendarList } from "@core/types/calendar.types";
import GoogleAuthService from "@backend/auth/services/google.auth.service";
import gcalService from "@backend/common/services/gcal/gcal.service";
import {
  error,
  AuthError,
  GcalError,
} from "@backend/common/errors/types/backend.errors";

export const getCalendarsToSync = async (gcal: gCalendar, userId: string) => {
  const gCalendarList = await gcalService.getCalendarlist(gcal);

  if (!gCalendarList.nextSyncToken) {
    throw error(
      AuthError.PaginationNotSupported,
      "Calendarlist sync token not saved"
    );
  }

  if (!gCalendarList.items) {
    throw error(GcalError.CalendarlistMissing, "Failed to map calendarlists");
  }

  // filter out everything but primary cal for now
  const primaryGcal = gCalendarList.items.filter((c) => {
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
    nextSyncToken: gCalendarList.nextSyncToken,
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
