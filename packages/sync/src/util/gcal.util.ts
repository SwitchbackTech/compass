import { Schema_CalendarList } from '@common/types/calendar.types';
import { GaxiosError } from 'gaxios';

export const isGoogleError = (e: GaxiosError | Error) => {
  return e instanceof GaxiosError;
};

export const getPrimaryGcalId = (calendarList: Schema_CalendarList) => {
  const primaryGCal = calendarList.google.items[0];
  const gCalendarId = primaryGCal.id as string;

  return gCalendarId;
};

// occurs when token expired or revoked
export const isInvalidGoogleToken = (e: GaxiosError | Error) => {
  const is400 = 'code' in e && e.code === '400';
  const hasInvalidMsg = 'message' in e && e.message === 'invalid_grant';
  const isInvalid = is400 && hasInvalidMsg;

  return isGoogleError(e) && isInvalid;
};

export const isFullSyncRequired = (e: GaxiosError | Error) => {
  const isFromGoogle = e instanceof GaxiosError;

  if (isFromGoogle && e.code && parseInt(e?.code) === 410) {
    return true;
  }

  return false;
};

export const isInvalidValue = (e: GaxiosError) => {
  return e.message === 'Invalid Value';
};
