import { GaxiosError } from "gaxios";
import { type gSchema$Event } from "@core/types/gcal";

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
  // Handle code as both string "400" and number 400
  const code = err.code;
  const is400 =
    code === "400" ||
    code === 400 ||
    err.response?.status === 400 ||
    (err as unknown as { status?: number }).status === 400;
  const hasInvalidMsg = err.message === "invalid_grant";
  const responseData = err.response?.data as
    | Record<string, unknown>
    | undefined;
  const hasInvalidData = responseData?.["error"] === "invalid_grant";

  return is400 && (hasInvalidMsg || hasInvalidData);
};

export const isGoogleError = (e: unknown) => {
  if (e instanceof GaxiosError) return true;

  const errObj = e as Record<string, unknown> | null | undefined;
  if (errObj?.["name"] === "GaxiosError") return true;

  // Also detect GaxiosError-like objects by structure, as errors from
  // google-auth-library may not pass instanceof checks due to module versions
  const hasGaxiosShape =
    typeof errObj === "object" &&
    errObj !== null &&
    "config" in errObj &&
    "response" in errObj &&
    typeof errObj["response"] === "object" &&
    errObj["response"] !== null &&
    "data" in (errObj["response"] as Record<string, unknown>);

  return hasGaxiosShape;
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
