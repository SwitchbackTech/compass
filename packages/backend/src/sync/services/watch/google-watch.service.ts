import { ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { type CalendarId, type EventId } from "@core/types/domain-primitives";
import {
  type Params_WatchEvents,
  type Payload_Sync_Notif,
  Resource_Sync,
  XGoogleResourceState,
} from "@core/types/sync.types";
import { ExpirationDateSchema } from "@core/types/type.utils";
import { WatchSchema } from "@core/types/watch.types";
import { error } from "@backend/common/errors/handlers/error.handler";
import { GcalError } from "@backend/common/errors/integration/gcal/gcal.errors";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import { WatchError } from "@backend/common/errors/sync/watch.errors";
import {
  createGoogleRequestContext,
  type GoogleRequestContext,
} from "@backend/common/services/gcal/gcal.context";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { isGoogleWatchUnsupported } from "@backend/common/services/gcal/gcal.utils";
import {
  deleteWatchesByUser,
  stopWatch,
  stopWatches,
} from "@backend/common/services/gcal/google-watch-cleanup.util";
import mongoService from "@backend/common/services/mongo.service";
import { sseServer } from "@backend/servers/sse/sse.server";
import { GCalEventsNotificationHandler } from "@backend/sync/services/notify/handler/gcal-events.notification.handler";
import { type NotificationOutcome } from "@backend/sync/services/notify/notification.outcome";
import {
  getSync,
  updateSync,
} from "@backend/sync/services/records/sync-records.repository";
import { isUsingGcalWebhookHttps } from "@backend/sync/services/watch/google-watch-config";
import { isWatchingGoogleResource } from "@backend/sync/services/watch/google-watch-state";
import { getChannelExpiration } from "@backend/sync/services/watch/google-watch-timing";

const logger = Logger("app:google-watch.service");

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

async function handleGoogleWatchNotification(
  payload: Payload_Sync_Notif,
): Promise<NotificationOutcome> {
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

  if (resource === Resource_Sync.CALENDAR) {
    const context = await createGoogleRequestContext(userId);
    // Dynamic import mirrors google-sync.service's user.service pattern to
    // avoid a static import cycle with this module.
    const { googleCalendarListService } = await import(
      "@backend/sync/services/calendarlist/google-calendarlist.service"
    );
    const { outcome } = await googleCalendarListService.reconcileCalendarList(
      context,
      userId,
    );

    logger.info(`CalendarList notification for user: ${userId} ${outcome}`);

    return outcome;
  }

  const context = await createGoogleRequestContext(userId);
  const handler = new GCalEventsNotificationHandler(
    context,
    userId,
    watch.gCalendarId,
    nextSyncToken,
  );

  const notification = await handler.handleNotification();

  if (notification.calendar?.isVisible) {
    sseServer.publishEventsChanged(userId, {
      calendarId: notification.calendar._id.toHexString() as CalendarId,
      eventIds: notification.eventIds as EventId[],
      reason: "reconciled",
    });
  }

  logger.info(
    `GCal Notification for user: ${userId}, calendarId: ${notification.calendar?._id.toHexString() ?? "unknown"} ${notification.summary}`,
  );

  return notification.summary;
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
        `Skipped Start Watch for ${Resource_Sync.EVENTS} (user: ${user})`,
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

    await updateSync(Resource_Sync.EVENTS, user, params.gCalendarId, {
      watchSupported: true,
    });

    return watch;
  } catch (err) {
    if (isGoogleWatchUnsupported(err)) {
      await updateSync(Resource_Sync.EVENTS, user, params.gCalendarId, {
        watchSupported: false,
      }).catch((metadataError) => {
        logger.error(
          `Failed to record unsupported events watch for user: ${user}`,
          metadataError,
        );
      });
      logger.info(
        `Events watch is not supported for a Google calendar (user: ${user})`,
      );
      return { acknowledged: false };
    }

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
