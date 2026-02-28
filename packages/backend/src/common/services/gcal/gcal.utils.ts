import { GaxiosError } from "gaxios";
import { gSchema$Event } from "@core/types/gcal";

const cancelled = (e: gSchema$Event) => {
  /*
  'cancelled' is the same as deleted according to Gcal API
      - however, there's an exception for 'uncancelled recurring events',
        so this'll need to be updated once Compass supports recurring events
      - see 'status' section of: https://developers.google.com/calendar/api/v3/reference/events#resource
  */
  return e.status && e.status === "cancelled";
};

export const cancelledEventsIds = (events: gSchema$Event[]) => {
  const cancelledIds: string[] = [];
  events.filter(cancelled).forEach((e: gSchema$Event) => {
    if (e.id) cancelledIds.push(e.id);
  });
  return cancelledIds;
};

export const categorizeGcalEvents = (events: gSchema$Event[]) => {
  const baseEvent = events.find(
    (event) => event.recurrence && !event.recurringEventId,
  );
  const instances = events.filter((event) => event.recurringEventId);

  const cancelledEvents = events.filter(
    (event) => event.status === "cancelled",
  );
  return { baseEvent, instances, cancelledEvents };
};

export const getEmailFromUrl = (url: string) => {
  const emailMatch = url.match(/\/calendars\/([^/]+)\/events/);

  if (emailMatch && emailMatch[1]) {
    return emailMatch[1].replace("%40", "@");
  }

  return null;
};

// occurs when token expired or revoked
export const isInvalidGoogleToken = (e: unknown) => {
  if (!isGoogleError(e)) return false;

  const err = e as GaxiosError;
  const is400 = err.code === "400" || err.response?.status === 400;
  const hasInvalidMsg = err.message === "invalid_grant";
  const hasInvalidData = err.response?.data?.error === "invalid_grant";

  return is400 && (hasInvalidMsg || hasInvalidData);
};

export const isGoogleError = (e: unknown) => {
  return e instanceof GaxiosError || (e as any)?.name === "GaxiosError";
};

export const getGoogleErrorStatus = (e: unknown) => {
  if (!isGoogleError(e)) return undefined;

  const err = e as GaxiosError;
  const responseStatus = err.response?.status;

  if (typeof responseStatus === "number") return responseStatus;
  if (typeof err.code === "number") return err.code;

  if (typeof err.code === "string") {
    const code = Number.parseInt(err.code, 10);
    if (!Number.isNaN(code)) return code;
  }

  return undefined;
};

export const isFullSyncRequired = (e: unknown) => {
  return getGoogleErrorStatus(e) === 410;
};

export const isInvalidValue = (e: GaxiosError) => {
  return e.message === "Invalid Value";
};
