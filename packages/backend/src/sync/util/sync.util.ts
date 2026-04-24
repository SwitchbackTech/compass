import { BaseError } from "@core/errors/errors.base";
import { Logger } from "@core/logger/winston.logger";
import { type Schema_Sync } from "@core/types/sync.types";
import dayjs from "@core/util/date/dayjs";
import { SYNC_BUFFER_DAYS } from "@backend/common/constants/backend.constants";
import { ENV, getApiBaseURL } from "@backend/common/constants/env.constants";
import { UserError } from "@backend/common/errors/user/user.errors";
import { getGcalWebhookBaseURL } from "@backend/common/util/api-base-url.util";

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
  const numMin = parseInt(ENV.CHANNEL_EXPIRATION_MIN, 10);
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

type ConcurrencyLimiter = <Result>(
  task: () => PromiseLike<Result> | Result,
) => Promise<Result>;

export const createConcurrencyLimiter = (
  concurrency: number,
): ConcurrencyLimiter => {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError("Concurrency must be an integer greater than 0");
  }

  let activeCount = 0;
  const queue: Array<() => void> = [];

  const runNext = () => {
    activeCount -= 1;
    queue.shift()?.();
  };

  return async <Result>(
    task: () => PromiseLike<Result> | Result,
  ): Promise<Result> => {
    if (activeCount >= concurrency) {
      await new Promise<void>((resolve) => {
        queue.push(resolve);
      });
    }

    activeCount += 1;

    try {
      return await task();
    } finally {
      runNext();
    }
  };
};

export const isUsingHttps = () => getApiBaseURL().startsWith("https://");

export const isUsingGcalWebhookHttps = () =>
  getGcalWebhookBaseURL().startsWith("https://");

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

export const isMissingGoogleRefreshToken = (
  error: unknown,
): error is BaseError => {
  return (
    error instanceof BaseError &&
    error.description === UserError.MissingGoogleRefreshToken.description
  );
};
