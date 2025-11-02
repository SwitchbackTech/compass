import { ClientSession, ObjectId, UpdateFilter, UpdateResult } from "mongodb";
import { Origin } from "@core/constants/core.constants";
import {
  Resource_Sync,
  Schema_Sync,
  SyncDetails,
  SyncFilter,
  SyncFilterSchema,
} from "@core/types/sync.types";
import dayjs from "@core/util/date/dayjs";
import calendarService from "@backend/calendar/services/calendar.service";
import mongoService from "@backend/common/services/mongo.service";

/**
 * Helper funcs that predominately query/update the DB
 */

export const getSync = async (params: SyncFilter, session?: ClientSession) => {
  const filter = SyncFilterSchema.parse(params);
  const sync = await mongoService.sync.findOne(filter, { session });

  return sync;
};

export const getSyncByToken = async (
  syncToken: string,
  session?: ClientSession,
) => {
  const resources = [Resource_Sync.CALENDAR, Resource_Sync.EVENTS];

  for (const r of resources) {
    const match = await mongoService.sync.findOne(
      {
        [`google.${r}.nextSyncToken`]: syncToken,
      },
      { session },
    );

    if (match) {
      return match;
    }
  }

  return null;
};

export const getGCalEventsSync = async (
  userId: string,
  gCalendarId: string,
  session?: ClientSession,
): Promise<SyncDetails | undefined> => {
  const response = await mongoService.sync.findOne(
    { user: userId, "google.events.gCalendarId": gCalendarId },
    { session },
  );

  return response?.google?.events?.find((e) => e.gCalendarId === gCalendarId);
};

export const getGCalEventsSyncPageToken = async (
  userId: string,
  gCalendarId: string,
  session?: ClientSession,
): Promise<string | undefined | null> => {
  const response = await getGCalEventsSync(userId, gCalendarId, session);

  return response?.nextPageToken;
};

export const hasUpdatedCompassEventRecently = async (
  user: ObjectId,
  deadline: string,
  session?: ClientSession,
) => {
  const calendars = await calendarService.getAllByUser(user);
  const recentChanges = await mongoService.event.countDocuments(
    {
      calendar: { $in: calendars.map((cal) => cal._id) },
      origin: Origin.COMPASS,
      updatedAt: { $gt: new Date(deadline) },
    },
    { session },
  );

  return recentChanges > 0;
};

export const isWatchingGoogleResource = async (
  userId: ObjectId,
  gCalendarId: string,
  session?: ClientSession,
) => {
  const channel = await mongoService.watch.findOne(
    { user: userId.toString(), gCalendarId },
    { session },
  );

  if (!channel) return false;

  const expired = dayjs(channel.expiration).isSameOrBefore(dayjs());

  if (expired) {
    await mongoService.watch.deleteOne(
      { user: userId.toString(), gCalendarId },
      { session },
    );

    return false;
  }

  return true;
};

export const updateSync = async (
  resource: Exclude<Resource_Sync, "settings">,
  userId: string,
  gCalendarId: string,
  update: Partial<Omit<SyncDetails, "gCalendarId" | "lastSyncedAt">> = {},
  session?: ClientSession,
): Promise<UpdateResult<Schema_Sync>> => {
  const sync = await getSync({ user: userId }, session);

  const data = sync?.google?.[resource];
  const index = data?.findIndex((e) => e.gCalendarId === gCalendarId) ?? -1;
  const operation: UpdateFilter<Schema_Sync> = {};

  if (index === -1) {
    operation.$push = {
      [`google.${resource}`]: {
        ...update,
        gCalendarId,
        lastSyncedAt: new Date(),
      },
    };
  } else {
    operation.$set = {
      [`google.${resource}.${index}.gCalendarId`]: gCalendarId,
      ...Object.entries(update).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [`google.${resource}.${index}.${key}`]: value,
        }),
        {},
      ),
      [`google.${resource}.${index}.lastSyncedAt`]: new Date(),
    };
  }

  const response = await mongoService.sync.updateOne(
    { user: userId },
    operation,
    { session, upsert: true },
  );

  return response;
};
