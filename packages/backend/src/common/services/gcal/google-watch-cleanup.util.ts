import { type ClientSession, ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { type Result_Watch_Stop } from "@core/types/sync.types";
import { error } from "@backend/common/errors/handlers/error.handler";
import { UserError } from "@backend/common/errors/user/user.errors";
import {
  createGoogleRequestContext,
  type GoogleRequestContext,
} from "@backend/common/services/gcal/gcal.context";
import gcalService from "@backend/common/services/gcal/gcal.service";
import {
  getGoogleErrorStatus,
  isInvalidGoogleToken,
  isMissingGoogleRefreshToken,
} from "@backend/common/services/gcal/gcal.utils";
import mongoService from "@backend/common/services/mongo.service";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

const logger = Logger("app:google-watch-cleanup");

/**
 * Stops a single Google watch channel: tells Google to stop pushing
 * notifications, then removes the local watch record. Any of the "Google
 * side is already gone" errors (channel not found, auth revoked, refresh
 * token missing) are treated as success - there is nothing left to stop.
 */
export async function stopWatch(
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

/**
 * Stops every watch channel for a user, best-effort - a single channel
 * failing to stop (logged, not thrown) never blocks the others or the
 * account-deletion transaction that usually calls this.
 */
export async function stopWatches(
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
      stopWatch(
        user,
        _id.toString(),
        resourceId,
        prepared.context,
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

  return result.filter(
    (identity): identity is { channelId: string; resourceId: string } =>
      identity !== undefined,
  );
}

/**
 * Deletes a user's watch records without calling Google - for cases where
 * Google access is already gone (revoked/missing refresh token), so there
 * is nothing left to tell Google to stop.
 */
export async function deleteWatchesByUser(
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
