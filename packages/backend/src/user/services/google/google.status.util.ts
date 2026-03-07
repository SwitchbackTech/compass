import { Resource_Sync, type Schema_Sync } from "@core/types/sync.types";
import {
  type GoogleConnectionStatus,
  type GoogleSyncStatus,
  type Schema_User,
  type UserMetadata,
} from "@core/types/user.types";
import { type Schema_Watch } from "@core/types/watch.types";

const isWatchActive = (watch: Schema_Watch) => watch.expiration > new Date();

export const getGoogleConnectionStatus = (
  user: Schema_User | null,
): GoogleConnectionStatus => {
  if (!user?.google?.googleId) return "not_connected";
  if (!user.google.gRefreshToken) return "reconnect_required";
  return "connected";
};

export const hasHealthyGoogleSync = (
  sync: Schema_Sync | null,
  watches: Schema_Watch[],
): boolean => {
  if (!sync?.google) return false;

  const activeWatches = watches.filter(isWatchActive);
  const { calendarlist = [], events = [] } = sync.google;

  if (calendarlist.length === 0 || events.length === 0) {
    return false;
  }

  const hasCalendarWatch = activeWatches.some(
    (watch) => watch.gCalendarId === Resource_Sync.CALENDAR,
  );
  const hasCalendarTokens = calendarlist.every((entry) =>
    Boolean(entry.nextSyncToken),
  );
  const hasEventTokens = events.every((entry) => Boolean(entry.nextSyncToken));
  const hasEventWatches = events.every((entry) =>
    activeWatches.some((watch) => watch.gCalendarId === entry.gCalendarId),
  );

  return (
    hasCalendarWatch && hasCalendarTokens && hasEventTokens && hasEventWatches
  );
};

export const getGoogleSyncStatus = ({
  connectionStatus,
  importStatus,
  isHealthy,
}: {
  connectionStatus: GoogleConnectionStatus;
  importStatus: NonNullable<UserMetadata["sync"]>["importGCal"];
  isHealthy: boolean;
}): GoogleSyncStatus => {
  if (connectionStatus !== "connected") return "none";
  if (importStatus === "importing" || importStatus === "restart") {
    return "repairing";
  }
  if (isHealthy) return "healthy";
  if (importStatus === "errored") return "attention";
  return "attention";
};
