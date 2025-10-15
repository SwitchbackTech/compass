import { ClientSession, UpdateFilter, UpdateResult } from "mongodb";
import zod from "zod";
import { Origin } from "@core/constants/core.constants";
import { Schema_CalendarList } from "@core/types/calendar.types";
import {
  Resource_Sync,
  Schema_Sync,
  SyncDetails,
} from "@core/types/sync.types";
import dayjs from "@core/util/date/dayjs";
import { getPrimaryGcalId } from "@backend/common/services/gcal/gcal.utils";
import mongoService from "@backend/common/services/mongo.service";

/**
 * Helper funcs that predominately query/update the DB
 */

export const resourceValidationSchema = zod
  .enum([Resource_Sync.EVENTS, Resource_Sync.CALENDAR])
  .default(Resource_Sync.EVENTS);

export const syncFilterValidationSchema = zod
  .object({
    userId: zod.string(),
    resource: resourceValidationSchema,
    gCalendarId: zod.string().optional(),
  })
  .transform(({ userId, resource, gCalendarId }) => ({
    user: userId,
    ...(gCalendarId ? { [`google.${resource}.gCalendarId`]: gCalendarId } : {}),
  }));

export const channelFilterValidationSchema = zod
  .object({
    resource: resourceValidationSchema,
    gCalendarId: zod.string().optional(),
  })
  .transform(({ resource, gCalendarId }) => ({
    ...(gCalendarId ? { [`google.${resource}.gCalendarId`]: gCalendarId } : {}),
  }));

export const getSyncParamsValidationSchema = zod.union([
  syncFilterValidationSchema,
  channelFilterValidationSchema,
]);

export const reInitSyncByIntegration = async (
  integration: "google",
  userId: string,
  calendarList: Schema_CalendarList,
  calListSyncToken: string,
) => {
  const gCalendarId = getPrimaryGcalId(calendarList);

  const result = await mongoService.sync.updateOne(
    {
      user: userId,
    },
    {
      $set: {
        [integration]: {
          calendarlist: [
            {
              gCalendarId,
              nextSyncToken: calListSyncToken,
              lastSyncedAt: new Date(),
            },
          ],
          events: [],
        },
      },
    },
  );

  return result;
};

export const deleteAllSyncData = async (userId: string) => {
  await mongoService.sync.deleteOne({ user: userId });
};

export const getSync = async (
  params:
    | { userId: string }
    | {
        userId: string;
        gCalendarId: string;
        resource?: Exclude<Resource_Sync, Resource_Sync.SETTINGS>;
      },
) => {
  const filter = getSyncParamsValidationSchema.parse(params);
  const sync = await mongoService.sync.findOne(filter);

  return sync;
};

export const getSyncByToken = async (syncToken: string) => {
  const resources = [Resource_Sync.CALENDAR, Resource_Sync.EVENTS];

  for (const r of resources) {
    const match = await mongoService.sync.findOne({
      [`google.${r}.nextSyncToken`]: syncToken,
    });

    if (match) {
      return match;
    }
  }

  return null;
};

export const getGCalEventsSyncPageToken = async (
  userId: string,
  gCalendarId: string,
  session?: ClientSession,
): Promise<string | undefined | null> => {
  const response = await mongoService.sync.findOne(
    { user: userId, "google.events.gCalendarId": gCalendarId },
    { session },
  );

  return response?.google.events.find((e) => e.gCalendarId === gCalendarId)
    ?.nextPageToken;
};

export const hasUpdatedCompassEventRecently = async (
  userId: string,
  deadline: string,
) => {
  const recentChanges = await mongoService.event.countDocuments({
    user: userId,
    origin: Origin.COMPASS,
    updatedAt: { $gt: new Date(deadline) },
  });

  return recentChanges > 0;
};

export const isWatchingGoogleResource = async (
  userId: string,
  gCalendarId: string = Resource_Sync.CALENDAR,
) => {
  const channel = await mongoService.watch.findOne({
    user: userId,
    gCalendarId,
  });

  if (!channel) return false;

  const expired = dayjs(channel.expiration).isSameOrBefore(dayjs());

  if (expired) {
    await mongoService.watch.deleteOne({ user: userId, gCalendarId });

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
  const sync = await getSync({ userId });

  const data = sync?.google[resource];
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
