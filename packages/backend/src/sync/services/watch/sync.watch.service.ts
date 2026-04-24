import { type ClientSession, ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { type gCalendar } from "@core/types/gcal";
import {
  type Params_WatchEvents,
  Resource_Sync,
  type Result_Watch_Stop,
} from "@core/types/sync.types";
import { ExpirationDateSchema } from "@core/types/type.utils";
import { WatchSchema } from "@core/types/watch.types";
import { getGcalClient } from "@backend/auth/services/google/clients/google.calendar.client";
import { Collections } from "@backend/common/constants/collections";
import { error } from "@backend/common/errors/handlers/error.handler";
import { GcalError } from "@backend/common/errors/integration/gcal/gcal.errors";
import { WatchError } from "@backend/common/errors/sync/watch.errors";
import { UserError } from "@backend/common/errors/user/user.errors";
import gcalService from "@backend/common/services/gcal/gcal.service";
import {
  getGoogleErrorStatus,
  isInvalidGoogleToken,
} from "@backend/common/services/gcal/gcal.utils";
import mongoService from "@backend/common/services/mongo.service";
import { isWatchingGoogleResource } from "@backend/sync/util/sync.queries";
import {
  getChannelExpiration,
  isMissingGoogleRefreshToken,
  isUsingGcalWebhookHttps,
} from "@backend/sync/util/sync.util";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

const logger = Logger("app:sync.watch.service");

class SyncWatchService {
  deleteAllByGcalId = async (gCalendarId: string, session?: ClientSession) => {
    return mongoService.sync.deleteMany(
      { "google.events.gCalendarId": gCalendarId },
      { session },
    );
  };

  deleteAllByUser = async (userId: string, session?: ClientSession) => {
    return mongoService.sync.deleteMany({ user: userId }, { session });
  };

  deleteByIntegration = async (integration: "google", userId: string) => {
    return mongoService.db
      .collection(Collections.SYNC)
      .updateOne({ user: userId }, { $unset: { [integration]: "" } });
  };

  deleteWatchesByUser = async (
    user: string,
    session?: ClientSession,
  ): Promise<Result_Watch_Stop> => {
    const watches = await mongoService.watch
      .find({ user }, { session })
      .toArray();

    await mongoService.watch.deleteMany({ user }, { session });

    return watches.map(({ _id, resourceId }) => ({
      channelId: _id.toString(),
      resourceId,
    }));
  };

  private prepareStopWatches = async (
    user: string,
    gcal?: gCalendar,
    session?: ClientSession,
  ) => {
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
  };

  refreshWatch = async (
    userId: string,
    payload: Params_WatchEvents,
    gcal?: gCalendar,
  ) => {
    const gcalClient = gcal ?? (await getGcalClient(userId));

    const watchExists = payload.channelId && payload.resourceId;

    if (watchExists) {
      await this.stopWatch(
        userId,
        payload.channelId,
        payload.resourceId,
        gcalClient,
      );
    }

    const watchResult = await this.startWatchingGcalResources(
      userId,
      [{ gCalendarId: payload.gCalendarId, quotaUser: payload.quotaUser }],
      gcalClient,
    );

    return watchResult[0];
  };

  startWatchingGcalCalendars = async (
    user: string,
    params: Pick<Params_WatchEvents, "quotaUser">,
    gcal: gCalendar,
  ): Promise<{ acknowledged: boolean; insertedId?: ObjectId }> => {
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
          await this.stopWatch(user, channelId, resourceId, gcal);

          throw error;
        });

      return watch;
    } catch (err) {
      logger.error(`Error starting calendar watch for user: ${user}`, err);

      return { acknowledged: false };
    }
  };

  startWatchingGcalEvents = async (
    user: string,
    params: Pick<Params_WatchEvents, "gCalendarId" | "quotaUser">,
    gcal: gCalendar,
  ): Promise<{ acknowledged: boolean; insertedId?: ObjectId }> => {
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
        throw error(
          GcalError.Unsure,
          "Event watch response missing resourceId",
        );
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
          await this.stopWatch(user, channelId, resourceId, gcal);

          throw error;
        });

      return watch;
    } catch (err) {
      logger.error(`Error starting events watch for user: ${user}`, err);

      return { acknowledged: false };
    }
  };

  startWatchingGcalResources = async (
    userId: string,
    watchParams: Pick<Params_WatchEvents, "gCalendarId" | "quotaUser">[],
    gcal: gCalendar,
  ) => {
    if (!isUsingGcalWebhookHttps()) {
      return [];
    }

    return Promise.all(
      watchParams.map((params) => {
        if (params.gCalendarId === Resource_Sync.CALENDAR) {
          return this.startWatchingGcalCalendars(userId, params, gcal);
        }

        return this.startWatchingGcalEvents(userId, params, gcal);
      }),
    );
  };

  stopWatch = async (
    user: string,
    channelId: string,
    resourceId: string,
    gcal?: gCalendar,
    quotaUser?: string,
    session?: ClientSession,
  ) => {
    const filter = { user, _id: new ObjectId(channelId), resourceId };

    try {
      const gcalClient = gcal ?? (await getGcalClient(user));

      await gcalService.stopWatch(gcalClient, {
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
  };

  stopWatches = async (
    user: string,
    gcal?: gCalendar,
    quotaUser?: string,
    session?: ClientSession,
  ): Promise<Result_Watch_Stop> => {
    const prepared = await this.prepareStopWatches(user, gcal, session);

    if (prepared.watches.length === 0) {
      return [];
    }

    logger.debug(
      `Stopping ${prepared.watches.length} gcal event watches for user: ${user}`,
    );
    const result = await Promise.all(
      prepared.watches.map(async ({ _id, resourceId }) =>
        this.stopWatch(
          user,
          _id.toString(),
          resourceId,
          prepared.gcal,
          quotaUser,
          session,
        ).catch((error) => {
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
  };
}

export const syncWatchService = new SyncWatchService();
export default syncWatchService;
