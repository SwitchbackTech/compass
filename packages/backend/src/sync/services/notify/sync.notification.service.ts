import { Logger } from "@core/logger/winston.logger";
import {
  type Payload_Sync_Notif,
  XGoogleResourceState,
} from "@core/types/sync.types";
import { getGcalClient } from "@backend/auth/services/google/clients/google.calendar.client";
import { error } from "@backend/common/errors/handlers/error.handler";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import mongoService from "@backend/common/services/mongo.service";
import { sseServer } from "@backend/servers/sse/sse.server";
import { GCalNotificationHandler } from "@backend/sync/services/notify/handler/gcal.notification.handler";
import syncWatchService from "@backend/sync/services/watch/sync.watch.service";
import { getSync } from "@backend/sync/util/sync.queries";

const logger = Logger("app:sync.notification.service");

class SyncNotificationService {
  cleanupStaleWatchChannel = async ({
    channelId,
    resourceId,
  }: Payload_Sync_Notif): Promise<boolean> => {
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
      await syncWatchService.stopWatch(
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
  };

  handleGcalNotification = async (payload: Payload_Sync_Notif) => {
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
      const cleanedUp = await this.cleanupStaleWatchChannel(payload);

      if (cleanedUp) return "IGNORED";

      logger.warn(
        `Ignoring notification because no active watch record exists for channel: ${payload.channelId.toString()}`,
      );

      return "IGNORED";
    }

    const sync = await getSync({ userId: watch.user, resource });

    if (!sync) {
      const cleanedUp = await this.cleanupStaleWatchChannel(payload);

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
  };
}

export const syncNotificationService = new SyncNotificationService();
export default syncNotificationService;
