import { Logger } from "@core/logger/winston.logger";
import type { Schema_Sync } from "@core/types/sync.types";
import dayjs from "@core/util/date/dayjs";
import { SYNC_BUFFER_DAYS } from "@backend/common/constants/backend.constants";
import { ENV } from "@backend/common/constants/env.constants";
import { getBaseURL } from "@backend/servers/ngrok/ngrok.utils";

const logger = Logger("app:sync.helpers");

/**
 * Helper functions that are used by the sync service
 * or multiple parts of the sync service's components
 */

/**
 * getChannelExpiration
 *
 * Calculates the channel expiration date based on the
 * CHANNEL_EXPIRATION_MIN environment variable.
 *
 * @returns {string} Channel expiration as a string representing a Unix timestamp in milliseconds.
 */
export const getChannelExpiration = (): string => {
  const numMin = parseInt(ENV.CHANNEL_EXPIRATION_MIN);
  const expiration = dayjs().add(numMin, "minutes");

  logExpirationReminder(numMin);

  return expiration.valueOf().toString();
};

export const hasGoogleHeaders = (headers: object) => {
  const expected = [
    "x-goog-channel-id",
    "x-goog-resource-id",
    "x-goog-resource-state",
    "x-goog-channel-expiration",
  ];

  const hasHeaders = expected.every((i) => i in headers);

  return hasHeaders;
};

/**
 * Determines if incremental sync can be performed for a sync record.
 *
 * Returns true only if:
 * - Sync record exists
 * - Google events array exists and is not empty
 * - Every calendar event has a non-null nextSyncToken
 *
 * Returns false if:
 * - Sync record is missing Google events data
 * - Any calendar event is missing a sync token
 * - Events array is empty (no calendars to sync)
 *
 * This is used to determine if a user needs a full restart sync
 * (RECONNECT_REPAIR) vs incremental sync (SIGNIN_INCREMENTAL).
 */
export const canDoIncrementalSync = (sync: Schema_Sync) => {
  const events = sync.google?.events;

  // If no events array exists, cannot do incremental sync
  if (!events || events.length === 0) {
    return false;
  }

  // All events must have a sync token for incremental sync
  return events.every((event) => event.nextSyncToken !== null);
};

export const isUsingHttps = () => getBaseURL().includes("https");

export const logExpirationReminder = (min: number) => {
  const hours = Math.round((min / 60) * 100) / 100;
  const days = Math.round((hours / 24) * 100) / 100;

  const label = hours > 24 ? `${days} days` : `${hours} hours`;
  logger.debug(`REMINDER: Channel will expire in ${min} minutes (${label})`);
};

export const syncExpired = (expiration: Date) => {
  return dayjs(expiration).isSameOrBefore(dayjs());
};

export const syncExpiresSoon = (expiration: Date) => {
  const deadline = dayjs().add(SYNC_BUFFER_DAYS, "days");

  return dayjs(expiration).isSameOrBefore(deadline);
};
