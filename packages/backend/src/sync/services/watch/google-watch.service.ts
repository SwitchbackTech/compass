import { type ClientSession, ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { type gCalendar } from "@core/types/gcal";
import {
  type Params_WatchEvents,
  type Payload_Sync_Notif,
  Resource_Sync,
  type Result_Watch_Stop,
  XGoogleResourceState,
} from "@core/types/sync.types";
import { ExpirationDateSchema } from "@core/types/type.utils";
import { WatchSchema } from "@core/types/watch.types";
import { error } from "@backend/common/errors/handlers/error.handler";
import { GcalError } from "@backend/common/errors/integration/gcal/gcal.errors";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import { WatchError } from "@backend/common/errors/sync/watch.errors";
import { UserError } from "@backend/common/errors/user/user.errors";
import gcalService from "@backend/common/services/gcal/gcal.service";
import {
  getGoogleErrorStatus,
  isInvalidGoogleToken,
} from "@backend/common/services/gcal/gcal.utils";
import mongoService from "@backend/common/services/mongo.service";
import { sseServer } from "@backend/servers/sse/sse.server";
import { getGcalClient } from "@backend/sync/services/google-calendar-sync/google.calendar.client";
import { GCalNotificationHandler } from "@backend/sync/services/notify/handler/gcal.notification.handler";
import {
  getSync,
  isWatchingGoogleResource,
} from "@backend/sync/util/sync.queries";
import {
  getChannelExpiration,
  isMissingGoogleRefreshToken,
  isUsingGcalWebhookHttps,
} from "@backend/sync/util/sync.util";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

const logger = Logger("app:google-watch.service");

async function deleteWatchesByUser(
  user: string,
  session?: ClientSession,
): Promise<Result_Watch_Stop> {
  const watches = await mongoService.watch
    .find({ user }, { session })
    .toArray();

  await mongoService.watch.deleteMany({ user }, { session });

  return watches.map(({ _id, resourceId }) => ({
    channelId: _id.toString(),
    resourceId,
  }));
}

async function prepareStopWatches(
  user: string,
  gcal?: gCalendar,
  session?: ClientSession,
) {
  const watches = await mongoService.watch
    .find({ user }, { session })
    .toArray();

  if (watches.length === 0 || gcal) {
    return { watches, gcal };
  }

  const compassUser = await findCompassUserBy("_id", user);

  if (!compassUser) {
    throw error(UserError.UserNotFound, "User not found");
  }

  if (!compassUser.google?.gRefreshToken) {
    await mongoService.watch.deleteMany({ user }, { session });

    logger.warn(
      "Google refresh token is missing. Corresponding watch records deleted",
    );

    return { watches: [], gcal };
  }

  return {
    watches,
    gcal: await getGcalClient(user),
  };
}

async function cleanupStaleWatch({
  channelId,
  resourceId,
}: Payload_Sync_Notif): Promise<boolean> {
  const channel = await mongoService.watch.findOne({
    _id: channelId,
    resourceId,
  });

  if (!channel) {
    logger.warn(
      `Ignoring stale Google notification because no exact watch exists for channelId: ${channelId.toString()}, resourceId: ${resourceId}`,
    );

    return false;
  }

  try {
    await googleWatchService.stopWatch(
      channel.user,
      channel._id.toString(),
      channel.resourceId,
    );

    logger.warn(
      `Cleaned up stale watch for user: ${channel.user} with channelId: ${channel._id.toString()} with resourceId: ${channel.resourceId}`,
    );

    return true;
  } catch (error) {
    logger.error(
      `Failed to clean up stale watch for user: ${channel.user} with channelId: ${channel._id.toString()}`,
      error,
    );

    return false;
  }
}

async function handleGoogleWatchNotification(payload: Payload_Sync_Notif) {
  const { channelId, resourceId, resourceState, resource } = payload;
  const { expiration } = payload;

  if (resourceState === XGoogleResourceState.SYNC) {
    logger.info(
      `${resource} sync initialized for channelId: ${payload.channelId.toString()}`,
    );

    return "INITIALIZED";
  }

  const watch = await mongoService.watch.findOne({
    _id: channelId,
    resourceId,
    expiration: { $gte: expiration },
  });

  if (!watch) {
    const cleanedUp = await googleWatchService.cleanupStaleWatch(payload);

    if (cleanedUp) return "IGNORED";

    logger.warn(
      `Ignoring notification because no active watch record exists for channel: ${payload.channelId.toString()}`,
    );

    return "IGNORED";
  }

  const sync = await getSync({ userId: watch.user, resource });

  if (!sync) {
    const cleanedUp = await googleWatchService.cleanupStaleWatch(payload);

    if (cleanedUp) return "IGNORED";

    logger.warn(
      `Ignoring notification because no sync record exists for channel: ${payload.channelId.toString()}`,
    );

    return "IGNORED";
  }

  const userId = sync.user;
  const { events = [], calendarlist = [] } = sync.google ?? {};
  const channels = [...events, ...calendarlist];
  const channel = channels.find((e) => e.gCalendarId === watch.gCalendarId);
  const calendarId = channel?.gCalendarId;
  const nextSyncToken = channel?.nextSyncToken;

  if (!nextSyncToken) {
    throw error(
      SyncError.NoSyncToken,
      `Notification not handled because no sync token found for calendarId: ${calendarId}`,
    );
  }

  const gcal = await getGcalClient(userId);
  const handler = new GCalNotificationHandler(
    gcal,
    resource,
    userId,
    watch.gCalendarId,
    nextSyncToken,
  );

  await handler.handleNotification();

  sseServer.handleBackgroundCalendarChange(userId);

  const result = "PROCESSED";

  logger.info(
    `GCal Notification for user: ${userId}, calendarId: ${calendarId} ${result}`,
  );

  return result;
}

async function refreshWatch(
  userId: string,
  payload: Params_WatchEvents,
  gcal?: gCalendar,
) {
  if (!gcal) gcal = await getGcalClient(userId);

  const watchExists = payload.channelId && payload.resourceId;

  if (watchExists) {
    await googleWatchService.stopWatch(
      userId,
      payload.channelId,
      payload.resourceId,
      gcal,
    );
  }

  const watchResult = await googleWatchService.startGoogleWatches(
    userId,
    [{ gCalendarId: payload.gCalendarId, quotaUser: payload.quotaUser }],
    gcal,
  );

  return watchResult[0];
}

async function startCalendarListWatch(
  user: string,
  params: Pick<Params_WatchEvents, "quotaUser">,
  gcal: gCalendar,
): Promise<{ acknowledged: boolean; insertedId?: ObjectId }> {
  try {
    const alreadyWatching = await isWatchingGoogleResource(
      user,
      Resource_Sync.CALENDAR,
    );

    if (alreadyWatching) {
      logger.error(
        `Skipped Start Watch for ${Resource_Sync.CALENDAR}`,
        WatchError.CalendarWatchExists,
      );

      return { acknowledged: false };
    }

    const expiration = getChannelExpiration();
    const _id = new ObjectId();
    const channelId = _id.toString();

    const { watch: gcalWatch } = await gcalService.watchCalendars(gcal, {
      ...params,
      channelId,
      expiration,
    });
    const resourceId = gcalWatch.resourceId;

    if (!resourceId) {
      throw error(
        GcalError.Unsure,
        "Calendar watch response missing resourceId",
      );
    }

    const watch = await mongoService.watch
      .insertOne(
        WatchSchema.parse({
          _id,
          user,
          gCalendarId: Resource_Sync.CALENDAR,
          resourceId,
          expiration: ExpirationDateSchema.parse(gcalWatch.expiration),
          createdAt: new Date(),
        }),
      )
      .catch(async (error) => {
        await googleWatchService.stopWatch(user, channelId, resourceId, gcal);

        throw error;
      });

    return watch;
  } catch (err) {
    logger.error(`Error starting calendar watch for user: ${user}`, err);

    return { acknowledged: false };
  }
}

async function startEventWatch(
  user: string,
  params: Pick<Params_WatchEvents, "gCalendarId" | "quotaUser">,
  gcal: gCalendar,
): Promise<{ acknowledged: boolean; insertedId?: ObjectId }> {
  try {
    const alreadyWatching = await isWatchingGoogleResource(
      user,
      params.gCalendarId,
    );

    if (alreadyWatching) {
      logger.error(
        `Skipped Start Watch for ${params.gCalendarId} ${Resource_Sync.EVENTS}`,
        WatchError.EventWatchExists,
      );

      return { acknowledged: false };
    }

    const expiration = getChannelExpiration();
    const _id = new ObjectId();
    const channelId = _id.toString();

    const { watch: gcalWatch } = await gcalService.watchEvents(gcal, {
      ...params,
      channelId,
      expiration,
    });
    const resourceId = gcalWatch.resourceId;

    if (!resourceId) {
      throw error(GcalError.Unsure, "Event watch response missing resourceId");
    }

    const watch = await mongoService.watch
      .insertOne(
        WatchSchema.parse({
          _id,
          user,
          gCalendarId: params.gCalendarId,
          resourceId,
          expiration: ExpirationDateSchema.parse(gcalWatch.expiration),
          createdAt: new Date(),
        }),
      )
      .catch(async (error) => {
        await googleWatchService.stopWatch(user, channelId, resourceId, gcal);

        throw error;
      });

    return watch;
  } catch (err) {
    logger.error(`Error starting events watch for user: ${user}`, err);

    return { acknowledged: false };
  }
}

async function startGoogleWatches(
  userId: string,
  watchParams: Pick<Params_WatchEvents, "gCalendarId" | "quotaUser">[],
  gcal: gCalendar,
) {
  if (!isUsingGcalWebhookHttps()) {
    return [];
  }

  return Promise.all(
    watchParams.map(async (params) => {
      if (params.gCalendarId === (Resource_Sync.CALENDAR as string)) {
        return googleWatchService.startCalendarListWatch(userId, params, gcal);
      }

      return googleWatchService.startEventWatch(userId, params, gcal);
    }),
  ).then((results) => results.filter((r) => r !== undefined));
}

async function stopWatch(
  user: string,
  channelId: string,
  resourceId: string,
  gcal?: gCalendar,
  quotaUser?: string,
  session?: ClientSession,
) {
  const filter = { user, _id: new ObjectId(channelId), resourceId };

  try {
    if (!gcal) gcal = await getGcalClient(user);

    await gcalService.stopWatch(gcal, {
      quotaUser,
      channelId,
      resourceId,
    });

    await mongoService.watch.deleteOne(filter, { session });

    return { channelId, resourceId };
  } catch (e) {
    const status = getGoogleErrorStatus(e);

    if (status === 404) {
      await mongoService.watch.deleteOne(filter, { session });

      logger.warn(
        "Channel no longer exists. Corresponding sync record deleted",
      );

      return undefined;
    }

    if (status === 401 || isInvalidGoogleToken(e)) {
      await mongoService.watch.deleteOne(filter, { session });

      logger.warn(
        "Google authorization is no longer valid. Corresponding sync record deleted",
      );

      return undefined;
    }

    if (isMissingGoogleRefreshToken(e)) {
      await mongoService.watch.deleteOne(filter, { session });

      logger.warn(
        "Google refresh token is missing. Corresponding watch record deleted",
      );

      return undefined;
    }

    throw e;
  }
}

async function stopWatches(
  user: string,
  gcal?: gCalendar,
  quotaUser?: string,
  session?: ClientSession,
): Promise<Result_Watch_Stop> {
  const prepared = await prepareStopWatches(user, gcal, session);

  if (prepared.watches.length === 0) {
    return [];
  }

  logger.debug(
    `Stopping ${prepared.watches.length} gcal event watches for user: ${user}`,
  );
  const result = await Promise.all(
    prepared.watches.map(async ({ _id, resourceId }) =>
      googleWatchService
        .stopWatch(
          user,
          _id.toString(),
          resourceId,
          prepared.gcal,
          quotaUser,
          session,
        )
        .catch((error) => {
          logger.error(
            `Error stopping watch for user: ${user}, channelId: ${_id.toString()}`,
            error,
          );

          return undefined;
        }),
    ),
  );

  const stopped = result.filter(
    (identity): identity is { channelId: string; resourceId: string } =>
      identity !== undefined,
  );

  return stopped;
}

export const googleWatchService = {
  deleteWatchesByUser,
  cleanupStaleWatch,
  handleGoogleWatchNotification,
  refreshWatch,
  startCalendarListWatch,
  startEventWatch,
  startGoogleWatches,
  stopWatch,
  stopWatches,
};
