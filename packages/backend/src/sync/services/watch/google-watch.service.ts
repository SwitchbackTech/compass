import { type ClientSession, ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { type CalendarId, type EventId } from "@core/types/domain-primitives";
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
import {
  createGoogleRequestContext,
  type GoogleRequestContext,
} from "@backend/common/services/gcal/gcal.context";
import gcalService from "@backend/common/services/gcal/gcal.service";
import {
  getGoogleErrorStatus,
  isInvalidGoogleToken,
} from "@backend/common/services/gcal/gcal.utils";
import mongoService from "@backend/common/services/mongo.service";
import { sseServer } from "@backend/servers/sse/sse.server";
import { isMissingGoogleRefreshToken } from "@backend/sync/services/google-sync/google-sync.errors";
import { GCalNotificationHandler } from "@backend/sync/services/notify/handler/gcal.notification.handler";
import { getSync } from "@backend/sync/services/records/sync-records.repository";
import { isUsingGcalWebhookHttps } from "@backend/sync/services/watch/google-watch-config";
import { isWatchingGoogleResource } from "@backend/sync/services/watch/google-watch-state";
import { getChannelExpiration } from "@backend/sync/services/watch/google-watch-timing";
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
  context?: GoogleRequestContext,
  session?: ClientSession,
) {
  const watches = await mongoService.watch
    .find({ user }, { session })
    .toArray();

  if (watches.length === 0 || context) {
    return { watches, context };
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

    return { watches: [], context };
  }

  return {
    watches,
    context: await createGoogleRequestContext(user),
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

  const context = await createGoogleRequestContext(userId);
  const handler = new GCalNotificationHandler(
    context,
    resource,
    userId,
    watch.gCalendarId,
    nextSyncToken,
  );

  const notification = await handler.handleNotification();

  if (notification.calendarId) {
    sseServer.publishEventsChanged(userId, {
      calendarId: notification.calendarId.toHexString() as CalendarId,
      eventIds: notification.eventIds as EventId[],
      reason: "reconciled",
    });
  }

  const result = "PROCESSED";

  logger.info(
    `GCal Notification for user: ${userId}, calendarId: ${calendarId} ${result}`,
  );

  return result;
}

async function refreshWatch(
  userId: string,
  payload: Params_WatchEvents,
  context?: GoogleRequestContext,
) {
  if (!context) context = await createGoogleRequestContext(userId);

  const watchExists = payload.channelId && payload.resourceId;

  if (watchExists) {
    await googleWatchService.stopWatch(
      userId,
      payload.channelId,
      payload.resourceId,
      context,
    );
  }

  const watchResult = await googleWatchService.startGoogleWatches(
    userId,
    [{ gCalendarId: payload.gCalendarId }],
    context,
  );

  return watchResult[0];
}

async function startCalendarListWatch(
  user: string,
  context: GoogleRequestContext,
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

    const { watch: gcalWatch } = await gcalService.watchCalendars(context, {
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
        await googleWatchService.stopWatch(
          user,
          channelId,
          resourceId,
          context,
        );

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
  params: Pick<Params_WatchEvents, "gCalendarId">,
  context: GoogleRequestContext,
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

    const { watch: gcalWatch } = await gcalService.watchEvents(context, {
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
        await googleWatchService.stopWatch(
          user,
          channelId,
          resourceId,
          context,
        );

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
  watchParams: Pick<Params_WatchEvents, "gCalendarId">[],
  context: GoogleRequestContext,
) {
  if (!isUsingGcalWebhookHttps()) {
    return [];
  }

  return Promise.all(
    watchParams.map(async (params) => {
      if (params.gCalendarId === (Resource_Sync.CALENDAR as string)) {
        return googleWatchService.startCalendarListWatch(userId, context);
      }

      return googleWatchService.startEventWatch(userId, params, context);
    }),
  ).then((results) => results.filter((r) => r !== undefined));
}

async function stopWatch(
  user: string,
  channelId: string,
  resourceId: string,
  context?: GoogleRequestContext,
  session?: ClientSession,
) {
  const filter = { user, _id: new ObjectId(channelId), resourceId };

  try {
    if (!context) context = await createGoogleRequestContext(user);

    await gcalService.stopWatch(context, {
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
  context?: GoogleRequestContext,
  session?: ClientSession,
): Promise<Result_Watch_Stop> {
  const prepared = await prepareStopWatches(user, context, session);

  if (prepared.watches.length === 0) {
    return [];
  }

  logger.debug(
    `Stopping ${prepared.watches.length} gcal event watches for user: ${user}`,
  );
  const result = await Promise.all(
    prepared.watches.map(async ({ _id, resourceId }) =>
      googleWatchService
        .stopWatch(user, _id.toString(), resourceId, prepared.context, session)
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
