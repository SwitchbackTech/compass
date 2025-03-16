import { WithId } from 'mongodb';
import { error } from '@common/errors/error.handler';
import { SyncError } from '@common/errors/sync.errors';
import { Schema_Sync } from '@common/types/sync.types';
import { ENV } from '@common/constants/env.constants';
import { minutesFromNow } from '@core/util/date.utils';

/**
 * Helper functions that are used by the sync service
 * or multiple parts of the sync service's components
 */

export const getCalendarInfo = (
  sync: WithId<Schema_Sync>,
  resourceId: string,
) => {
  const matches = sync.google.events.filter((g) => {
    return g.resourceId === resourceId;
  });

  if (!matches[0]) {
    throw error(SyncError.NoSyncRecordForUser, 'Sync Failed');
  }

  const gCalendarId = matches[0].gCalendarId;
  const nextSyncToken = matches[0].nextSyncToken;

  return {
    userId: sync.user,
    gCalendarId,
    nextSyncToken,
  };
};

export const getChannelExpiration = () => {
  const numMin = parseInt(ENV.CHANNEL_EXPIRATION_MIN);
  logExpirationReminder(numMin);
  const expiration = minutesFromNow(numMin, 'ms').toString();
  return expiration;
};

export const hasGoogleHeaders = (headers: object) => {
  const expected = [
    'x-goog-channel-id',
    'x-goog-resource-id',
    'x-goog-resource-state',
    'x-goog-channel-expiration',
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

export const hasAnyActiveEventSync = (sync: Schema_Sync) => {
  if (sync.google?.events === undefined) return false;

  for (const es of sync.google.events) {
    const hasSyncFields = es.channelId && es.expiration;
    if (hasSyncFields && !syncExpired(es.expiration)) {
      return true;
    }
  }
  return false;
};

export const isUsingHttps = () =>
  ENV.BASEURL !== undefined && ENV.BASEURL.includes('https');

export const logExpirationReminder = (min: number) => {
  const hours = Math.round((min / 60) * 100) / 100;
  const days = Math.round((hours / 24) * 100) / 100;

  const label = hours > 24 ? `${days} days` : `${hours} hours`;
  console.debug(`REMINDER: Channel will expire in ${min} minutes (${label})`);
};

export const syncExpired = (expiry: string) => {
  const expiration = new Date(parseInt(expiry)).getTime();
  const now = new Date().getTime();

  const expired = now > expiration;
  return expired;
};

export const syncExpiresSoon = (expiry: string) => {
  const MIN_IN_DAY = 1440;
  const SYNC_BUFFER_DAYS = 3;
  const deadline = minutesFromNow(MIN_IN_DAY * SYNC_BUFFER_DAYS, 'ms');

  const expiration = new Date(parseInt(expiry)).getTime();

  const expiresSoon = expiration < deadline;
  return expiresSoon;
};
