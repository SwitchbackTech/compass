import { GaxiosError } from "gaxios";
import { ClientSession, ObjectId } from "mongodb";
import { RESULT_NOTIFIED_CLIENT } from "@core/constants/websocket.constants";
import { Logger } from "@core/logger/winston.logger";
import { CalendarProvider, Schema_Calendar } from "@core/types/calendar.types";
import { gCalendar } from "@core/types/gcal";
import {
  Params_WatchEvents,
  Payload_Sync_Notif,
  Resource_Sync,
  Result_Watch_Stop,
} from "@core/types/sync.types";
import {
  ExpirationDateSchema,
  StringV4Schema,
  zObjectId,
} from "@core/types/type.utils";
import { Schema_Watch, WatchSchema } from "@core/types/watch.types";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import {
  GCAL_LIST_PAGE_SIZE,
  MONGO_BATCH_SIZE,
} from "@backend/common/constants/backend.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import { WatchError } from "@backend/common/errors/sync/watch.errors";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";
import { createSyncImport } from "@backend/sync/services/import/sync.import";
import {
  prepWatchMaintenanceForUser,
  pruneSync,
  refreshWatch,
} from "@backend/sync/services/maintain/sync.maintenance";
import { GCalNotificationHandler } from "@backend/sync/services/notify/handler/gcal.notification.handler";
import {
  getSync,
  isWatchingGoogleResource,
  updateSync,
} from "@backend/sync/util/sync.queries";
import {
  getChannelExpiration,
  isUsingHttps,
} from "@backend/sync/util/sync.util";

const logger = Logger("app:sync.service");

class SyncService {
  deleteAllByGcalId = async (gCalendarId: string) => {
    const delRes = await mongoService.sync.deleteMany({
      "google.events.gCalendarId": gCalendarId,
    });
    return delRes;
  };

  deleteAllByUser = async (userId: ObjectId) => {
    const delRes = await mongoService.sync.deleteMany({
      user: userId.toString(),
    });

    return delRes;
  };

  deleteByIntegration = async (
    integration: CalendarProvider,
    userId: string,
    session?: ClientSession,
  ) => {
    const response = await mongoService.sync.updateOne(
      { user: userId },
      { $unset: { [integration]: "" } },
      { session },
    );

    return response;
  };

  async cleanupStaleWatchChannel({
    channelId,
    resourceId,
  }: Payload_Sync_Notif): Promise<boolean> {
    const channels: Schema_Watch[] = [];

    const channel = await mongoService.watch.findOne({
      _id: channelId,
      resourceId,
    });

    if (channel) channels.push(channel);

    if (!channel) {
      logger.warn(
        `Exact match not found for stale watch record cleanup: { channelId: ${channelId}, resourceId: ${resourceId}}. Extending Search using resourceId only.`,
      );

      const resourceMatchedChannels = await mongoService.watch
        .find({ resourceId })
        .toArray();

      if (resourceMatchedChannels.length > 0) {
        logger.warn(
          `Found ${resourceMatchedChannels.length} watch records with resourceId: ${resourceId}.`,
        );

        channels.push(...resourceMatchedChannels);
      }
    }

    const possibleUserIds = new Set(
      channels.map((c) => zObjectId.parse(c.user)),
    );

    if (possibleUserIds.size === 0) {
      logger.error(
        `Stale watch cleanup failed. Couldn't find any watch based on this channelId: ${channelId} or resourceId: ${resourceId}`,
      );

      return false;
    }

    const deleted = await Promise.all(
      [...possibleUserIds].map(async (user): Promise<boolean> => {
        const result = await this.stopWatch(
          user,
          channelId.toString(),
          resourceId,
        );

        if (result) {
          logger.warn(
            `Cleaned up stale watch for user: ${user} with channelId: ${channelId} with resourceId: ${resourceId}`,
          );

          return true;
        }

        return false;
      }),
    );

    return deleted.some((d) => d);
  }

  handleGcalNotification = async (payload: Payload_Sync_Notif) => {
    const { channelId, resourceId, resourceState, resource } = payload;
    const { expiration } = payload;

    if (resourceState === "sync") {
      logger.info(
        `${resource} sync initialized for channelId: ${payload.channelId}`,
      );

      return "INITIALIZED";
    }

    const watch = await mongoService.watch.findOne({
      _id: channelId,
      resourceId,
      expiration: { $gte: expiration },
    });

    if (!watch) {
      // clean up stale watch channel;
      const cleanedUp = await this.cleanupStaleWatchChannel(payload);

      if (cleanedUp) return "IGNORED";

      throw error(
        WatchError.NoWatchRecordForUser,
        `Notification not handled because no watch record found for channel: ${payload.channelId}`,
      );
    }

    const sync = await getSync({ user: watch.user });

    if (!sync) {
      // clean up stale watch channel;
      const cleanedUp = await this.cleanupStaleWatchChannel(payload);

      if (cleanedUp) return "IGNORED";

      throw error(
        SyncError.NoSyncRecordForUser,
        `Notification not handled because no sync record found with channel: ${payload.channelId}`,
      );
    }

    const user = zObjectId.parse(sync.user);
    const { events = [], calendarlist = [] } = sync.google ?? {};
    const channels = [...events, ...calendarlist];
    const channel = channels.find((e) => e.gCalendarId === watch.gCalendarId);
    const calendarId = channel?.gCalendarId;
    const nextSyncToken = channel?.nextSyncToken;

    if (!nextSyncToken) {
      throw error(
        SyncError.NoSyncToken,
        `Notification not handled because no sync token found for calendarId: ${calendarId ?? watch.gCalendarId}`,
      );
    }

    // Get the Google Calendar client
    const gcal = await getGcalClient(user);

    // Create and use the notification handler
    const handler = new GCalNotificationHandler(
      gcal,
      resource,
      user,
      watch.gCalendarId,
      nextSyncToken,
    );

    await handler.handleNotification();

    const wsResult = webSocketServer.handleBackgroundCalendarChange(
      user.toString(),
    );

    const result = wsResult?.includes(RESULT_NOTIFIED_CLIENT)
      ? "PROCESSED AND NOTIFIED CLIENT"
      : "PROCESSED IN BACKGROUND";

    return result;
  };

  importFull = async (
    gcal: gCalendar,
    calendars: Schema_Calendar[],
    _session?: ClientSession,
  ) => {
    const session =
      _session ??
      (await mongoService.startSession({
        causalConsistency: true,
      }));

    const result = await (_session
      ? this.#importFull(gcal, calendars, _session)
      : session.withTransaction(async () =>
          this.#importFull(gcal, calendars, session),
        ));

    return result;
  };

  #importFull = async (
    gcal: gCalendar,
    calendars: Schema_Calendar[],
    session?: ClientSession,
  ) => {
    const syncImport = await createSyncImport(gcal);

    const eventImports = await Promise.all(
      calendars.map(async (calendar) => {
        const { nextSyncToken, ...result } = await syncImport.importAllEvents(
          calendar,
          GCAL_LIST_PAGE_SIZE,
          session,
        );

        if (isUsingHttps()) {
          await updateSync(
            Resource_Sync.EVENTS,
            calendar.user.toString(),
            calendar.metadata.id,
            { nextSyncToken },
            session,
          );
        } else {
          logger.warn(
            `Skipped updating sync token for user: ${calendar.user} and gCalId: ${calendar.metadata.id} because not using https`,
          );
        }

        return { calendar, ...result };
      }),
    );

    return eventImports;
  };

  importIncremental = async (
    user: ObjectId,
    gcal?: gCalendar,
    perPage = 1000,
  ) => {
    const syncImport = gcal
      ? await createSyncImport(gcal)
      : await createSyncImport(user);

    const result = await syncImport.importLatestEvents(user, perPage);

    return result;
  };

  refreshWatch = async (
    userId: ObjectId,
    payload: Params_WatchEvents,
    gcal?: gCalendar,
  ) => {
    if (!gcal) gcal = await getGcalClient(userId);

    const watchExists = payload.channelId && payload.resourceId;

    if (watchExists) {
      await this.stopWatch(userId, payload.channelId, payload.resourceId, gcal);
    }

    const watchResult = await this.startWatchingGcalResources(
      userId,
      [{ gCalendarId: payload.gCalendarId, quotaUser: payload.quotaUser }],
      gcal,
    );

    return watchResult[0];
  };

  runMaintenance = async () => {
    const cursor = mongoService.user.find().batchSize(MONGO_BATCH_SIZE);
    const users: ObjectId[] = [];
    const result = {
      deleted: 0,
      refreshed: 0,
      ignored: 0,
      pruned: 0,
      revoked: 0,
      resynced: 0,
    };

    for await (const user of cursor) {
      users.push(user._id);
    }

    const { default: pLimit } = await import("p-limit"); // esm module support
    // Limit concurrency to avoid resource exhaustion and API rate limits
    const limit = pLimit(5); // Adjust concurrency as needed

    const run = await Promise.all(
      users.map((user) =>
        limit(() =>
          this.runMaintenanceByUser(user, {
            log: false,
          }).catch((error) => {
            logger.error(
              `Error running sync maintenance for user: ${user.toString()}`,
              error,
            );

            return {
              ignore: [{ user: user.toString(), payload: [] }],
              prune: [{ user: user.toString(), payload: [] }],
              refresh: [{ user: user.toString(), payload: [] }],
              ...result,
            };
          }),
        ),
      ),
    );

    const results = run.reduce(
      (acc, res) => ({
        deleted: acc.deleted + res.deleted,
        refreshed: acc.refreshed + res.refreshed,
        ignored: acc.ignored + res.ignored,
        pruned: acc.pruned + res.pruned,
        revoked: acc.revoked + res.revoked,
        resynced: acc.resynced + res.resynced,
      }),
      result,
    );

    logger.debug(`Sync Maintenance Results:
      IGNORED: ${results.ignored}
      PRUNED: ${results.pruned}
      REFRESHED: ${results.refreshed}

      DELETED DURING PRUNE: ${results.deleted}
      REVOKED SESSION DURING REFRESH: ${results.revoked}
      RESYNCED DURING REFRESH: ${results.resynced}
    `);

    return results;
  };

  runMaintenanceByUser = async (
    userId: ObjectId,
    params: { dry?: boolean; log?: boolean } = { log: true },
  ) => {
    const user = await mongoService.user.findOne({ _id: userId });
    const maintenance = await prepWatchMaintenanceForUser(userId);
    const ignore = [{ user: userId, payload: maintenance.ignore }];
    const prune = [{ user: userId, payload: maintenance.prune }];
    const refresh = [{ user: userId, payload: maintenance.refresh }];

    const result = {
      ignore,
      prune,
      refresh,
      user: user?.email || "Not found",
      ignored: 0,
      pruned: 0,
      refreshed: 0,
      revoked: 0,
      deleted: 0,
      resynced: 0,
    };

    if (params?.dry) return result;

    const pruneResult = await pruneSync(prune);
    const pruned = pruneResult.filter((p) => !p.deletedUserData);
    const deletedDuringPrune = pruneResult.filter((p) => p.deletedUserData);
    const refreshResult = await refreshWatch(refresh);
    const refreshed = refreshResult.filter((r) => !r.revokedSession);
    const revokedSession = refreshResult.filter((r) => r.revokedSession);
    const resynced = refreshResult.filter((r) => r.resynced);

    if (params?.log) {
      logger.debug(`Sync Maintenance Results:
        IGNORED: ${ignore.length}
        PRUNED: ${pruned.flatMap((p) => p.results).toString()}
        REFRESHED: ${refreshed.flatMap((r) => r.results.filter((r) => r.success)).toString()}

        DELETED DURING PRUNE: ${deletedDuringPrune.map((r) => r.user).toString()}
        REVOKED SESSION DURING REFRESH: ${revokedSession
          .map((r) => r.user)
          .toString()}
        RESYNCED DURING REFRESH: ${resynced.map((r) => r.user).toString()}
      `);
    }

    return {
      ...result,
      ignored: ignore.flatMap(({ payload }) => payload).length,
      pruned: pruned.flatMap(({ results }) => results).length,
      refreshed: refreshed.flatMap(({ results }) =>
        results.filter((r) => r.success),
      ).length,
      revoked: revokedSession.length,
      deleted: deletedDuringPrune.length,
      resynced: resynced.length,
    };
  };

  startWatchingGcalCalendars = async (
    user: ObjectId,
    params: Pick<Params_WatchEvents, "quotaUser">,
    gcal: gCalendar,
    session?: ClientSession,
  ): Promise<{ acknowledged: boolean; insertedId?: ObjectId }> => {
    try {
      const alreadyWatching = await isWatchingGoogleResource(
        user,
        Resource_Sync.CALENDAR,
        session,
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

      const watch = await mongoService.watch
        .insertOne(
          WatchSchema.parse({
            _id,
            user: user.toString(),
            gCalendarId: Resource_Sync.CALENDAR,
            resourceId: gcalWatch.resourceId!,
            expiration: ExpirationDateSchema.parse(gcalWatch.expiration),
            createdAt: new Date(),
          }),
          { session },
        )
        .catch(async (error) => {
          await this.stopWatch(user, channelId, gcalWatch.resourceId!, gcal);

          throw error;
        });

      return watch;
    } catch (err) {
      logger.error(`Error starting calendar watch for user: ${user}`, err);

      return { acknowledged: false };
    }
  };

  startWatchingGcalEvents = async (
    user: ObjectId,
    params: Pick<Params_WatchEvents, "gCalendarId" | "quotaUser">,
    gcal: gCalendar,
    session?: ClientSession,
  ): Promise<{ acknowledged: boolean; insertedId?: ObjectId }> => {
    try {
      const alreadyWatching = await isWatchingGoogleResource(
        user,
        params.gCalendarId,
        session,
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

      const watch = await mongoService.watch
        .insertOne(
          WatchSchema.parse({
            _id,
            user: user.toString(),
            gCalendarId: params.gCalendarId,
            resourceId: gcalWatch.resourceId!,
            expiration: ExpirationDateSchema.parse(gcalWatch.expiration),
            createdAt: new Date(),
          }),
          { session },
        )
        .catch(async (error) => {
          await this.stopWatch(
            user,
            channelId,
            gcalWatch.resourceId!,
            gcal,
            new ObjectId().toString(),
            session,
          );

          throw error;
        });

      return watch;
    } catch (err) {
      logger.error(`Error starting events watch for user: ${user}`, err);

      return { acknowledged: false };
    }
  };

  startWatchingGcalResources = async (
    userId: ObjectId,
    watchParams: Pick<Params_WatchEvents, "gCalendarId" | "quotaUser">[],
    gcal: gCalendar,
    session?: ClientSession,
  ) => {
    return Promise.all(
      watchParams.map(async (params) => {
        switch (params.gCalendarId) {
          case Resource_Sync.CALENDAR:
            return this.startWatchingGcalCalendars(
              userId,
              params,
              gcal,
              session,
            );
          default:
            return this.startWatchingGcalEvents(userId, params, gcal, session);
        }
      }),
    ).then((results) => results.filter((r) => r !== undefined));
  };

  stopWatch = async (
    user: ObjectId,
    channelId: string,
    resourceId: string,
    gcal?: gCalendar,
    quotaUser?: string,
    session?: ClientSession,
  ): Promise<{ channelId: string; resourceId: string } | undefined> => {
    if (!gcal) gcal = await getGcalClient(user);

    try {
      await mongoService.watch.deleteOne(
        {
          user: user.toString(),
          _id: new ObjectId(channelId),
          resourceId,
        },
        { session },
      );

      await gcalService.stopWatch(gcal, {
        quotaUser,
        channelId,
        resourceId,
      });

      return { channelId, resourceId };
    } catch (e) {
      const _e = e as GaxiosError;
      const code = (_e.code as unknown as number) || 0;

      if (_e.code === "404" || code === 404) {
        logger.warn(
          "Channel no longer exists. Corresponding sync record deleted",
        );
      }

      logger.error(
        `Error stopping watch for user: ${user}, channelId: ${channelId}`,
        error,
      );

      return undefined;
    }
  };

  stopWatches = async (
    user: ObjectId,
    gcal?: gCalendar,
    quotaUser?: string,
    session?: ClientSession,
  ): Promise<Result_Watch_Stop> => {
    logger.debug(`Stopping all gcal event watches for user: ${user}`);

    if (!gcal) gcal = await getGcalClient(user);

    const watches = await mongoService.watch
      .find({ user: user.toString() }, { session })
      .toArray();

    const result = await Promise.all(
      watches.map(async ({ _id, resourceId }) =>
        this.stopWatch(
          user,
          _id.toString(),
          resourceId,
          gcal,
          quotaUser,
          session,
        ),
      ),
    );

    const stopped = result.filter((identity) => identity !== undefined);

    return stopped;
  };

  getCalendarsToSync = async (
    gcal: gCalendar,
    primaryOnly = true, // remove after full sync support is active
  ) => {
    const calendarListResponse = await gcalService.getCalendarlist(gcal);

    const { items = [], nextPageToken } = calendarListResponse;

    const nextSyncToken = StringV4Schema.parse(
      calendarListResponse.nextSyncToken,
      {
        error: () =>
          "Failed to get all the calendars to sync. No nextSyncToken",
      },
    );

    const primaryGcal = items.find(({ primary }) => primary);

    const calendars = primaryOnly ? (primaryGcal ? [primaryGcal] : []) : items;

    const gCalendarIds = calendars
      .map(({ id }) => id)
      .filter((id) => id !== undefined && id !== null);

    return {
      calendars,
      gCalendarIds,
      nextSyncToken,
      nextPageToken,
    };
  };
}

export default new SyncService();
