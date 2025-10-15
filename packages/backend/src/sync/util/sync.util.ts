import { Logger } from "@core/logger/winston.logger";
import type { Schema_Sync } from "@core/types/sync.types";
import { minutesFromNow } from "@core/util/date/date.util";
import { SYNC_BUFFER_DAYS } from "@backend/common/constants/backend.constants";
import { ENV } from "@backend/common/constants/env.constants";
import { getBaseURL } from "@backend/servers/ngrok/ngrok.utils";
import dayjs from "../../../../core/src/util/date/dayjs";

const logger = Logger("app:sync.helpers");

/**
 * Helper functions that are used by the sync service
 * or multiple parts of the sync service's components
 */

export const getChannelExpiration = () => {
  const numMin = parseInt(ENV.CHANNEL_EXPIRATION_MIN);
  logExpirationReminder(numMin);
  const expiration = minutesFromNow(numMin, "ms").toString();
  return expiration;
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

export const canDoIncrementalSync = (sync: Schema_Sync) => {
  const everyCalendarHasSyncToken = sync.google?.events?.every(
    (event) => event.nextSyncToken !== null,
  );
  return everyCalendarHasSyncToken;
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
