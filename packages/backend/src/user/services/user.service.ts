import { TokenPayload } from "google-auth-library";
import mergeWith from "lodash.mergewith";
import SupertokensUserMetadata, {
  JSONObject,
} from "supertokens-node/recipe/usermetadata";
import { BaseError } from "@core/errors/errors.base";
import { Logger } from "@core/logger/winston.logger";
import { mapUserToCompass } from "@core/mappers/map.user";
import { mapCompassUserToEmailSubscriber } from "@core/mappers/subscriber/map.subscriber";
import { UserInfo_Google } from "@core/types/auth.types";
import { Resource_Sync } from "@core/types/sync.types";
import { Schema_User, UserMetadata } from "@core/types/user.types";
import compassAuthService from "@backend/auth/services/compass.auth.service";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import calendarService from "@backend/calendar/services/calendar.service";
import { ENV } from "@backend/common/constants/env.constants";
import { isMissingUserTagId } from "@backend/common/constants/env.util";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";
import { CompassError } from "@backend/common/types/error.types";
import { Summary_Resync } from "@backend/common/types/sync.types";
import EmailService from "@backend/email/email.service";
import eventService from "@backend/event/services/event.service";
import priorityService from "@backend/priority/services/priority.service";
import { getCalendarsToSync } from "@backend/sync/services/init/sync.init";
import syncService from "@backend/sync/services/sync.service";
import { reInitSyncByIntegration } from "@backend/sync/util/sync.queries";
import { isUsingHttps } from "@backend/sync/util/sync.util";
import { findCompassUserBy } from "@backend/user/queries/user.queries";
import { Summary_Delete } from "@backend/user/types/user.types";

const logger = Logger("app:user.service");

export enum Result_Resync {
  SUCCESS = "success",
  FAILED = "failed",
}

class UserService {
  createUser = async (
    gUser: UserInfo_Google["gUser"],
    gRefreshToken: string,
  ): Promise<Schema_User & { userId: string }> => {
    const _compassUser = mapUserToCompass(gUser, gRefreshToken);
    const compassUser = { ..._compassUser, signedUpAt: new Date() };

    const createUserRes = await mongoService.user.insertOne(compassUser);

    const userId = createUserRes.insertedId.toString();
    if (!userId) {
      throw error(AuthError.NoUserId, "Failed to create Compass user");
    }

    return {
      ...compassUser,
      userId,
    };
  };

  deleteCompassDataForUser = async (userId: string, gcalAccess = true) => {
    const summary: Summary_Delete = {};

    try {
      const priorities = await priorityService.deleteAllByUser(userId);
      summary.priorities = priorities.deletedCount;

      const calendars = await calendarService.deleteAllByUser(userId);
      summary.calendarlist = calendars.deletedCount;

      const events = await eventService.deleteAllByUser(userId);
      summary.events = events.deletedCount;

      if (gcalAccess) {
        const watches = await syncService.stopWatches(userId);
        summary.eventWatches = watches.length;
      }

      const user = await findCompassUserBy("_id", userId);
      if (!user) {
        throw error(AuthError.NoUserId, "Failed to find user");
      }

      const syncs = await syncService.deleteAllByUser(userId);
      summary.syncs = syncs.deletedCount;

      // delete other users with same email
      const staleSyncs = await syncService.deleteAllByGcalId(
        user.google.googleId,
      );
      summary.syncs += staleSyncs.deletedCount;

      initSupertokens();
      const { sessionsRevoked } =
        await compassAuthService.revokeSessionsByUser(userId);
      summary.sessions = sessionsRevoked;

      const _user = await this.deleteUser(userId);
      summary.user = _user.deletedCount;
      return summary;
    } catch (e) {
      const _e = e as BaseError;
      console.log("Stopped early because:", _e.description || _e);

      const _user = await this.deleteUser(userId);
      summary.user = _user.deletedCount;

      return summary;
    }
  };

  deleteUser = async (userId: string) => {
    logger.info(`Deleting all data for user: ${userId}`);

    const response = await mongoService.user.deleteOne({
      _id: mongoService.objectId(userId),
    });

    return response;
  };

  initUserData = async (gUser: TokenPayload, gRefreshToken: string) => {
    const cUser = await this.createUser(gUser, gRefreshToken);
    const { userId } = cUser;

    if (isMissingUserTagId()) {
      logger.warn(
        "Did not tag subscriber due to missing EMAILER_ ENV value(s)",
      );
    } else {
      const subscriber = mapCompassUserToEmailSubscriber(cUser);
      await EmailService.addTagToSubscriber(
        subscriber,
        ENV.EMAILER_USER_TAG_ID!,
      );
    }

    await priorityService.createDefaultPriorities(userId);

    await eventService.createDefaultSomedays(userId);

    return userId;
  };

  reSyncGoogleData = async (userId: string) => {
    logger.warn(`Re-syncing google data for user: ${userId}`);
    const summary: Summary_Resync = { _delete: {}, recreate: {} };

    try {
      summary._delete = await this._deleteBeforeReSyncingGoogle(userId);
      summary.recreate = await this._reSyncGoogle(userId);

      return { result: Result_Resync.SUCCESS, summary };
    } catch (e) {
      const _e = e as CompassError;
      return { result: Result_Resync.FAILED, summary, error: _e };
    }
  };

  saveTimeFor = async (label: "lastLoggedInAt", userId: string) => {
    const res = await mongoService.user.findOneAndUpdate(
      { _id: mongoService.objectId(userId) },
      { $set: { [label]: new Date() } },
    );

    return res;
  };

  _deleteBeforeReSyncingGoogle = async (
    userId: string,
  ): Promise<Summary_Resync["_delete"]> => {
    const calendarlist = await calendarService.deleteByIntegrateion(
      "google",
      userId,
    );

    const events = await eventService.deleteByIntegration("google", userId);

    const watches = await syncService.stopWatches(userId);

    const sync = await syncService.deleteByIntegration("google", userId);

    return {
      calendarlist,
      events,
      watches,
      sync,
    };
  };

  _reSyncGoogle = async (
    userId: string,
  ): Promise<Summary_Resync["recreate"]> => {
    const gcal = await getGcalClient(userId);
    const { cCalendarList, gCalendarIds, calListNextSyncToken } =
      await getCalendarsToSync(userId, gcal);

    const calendarlist = await calendarService.add(
      "google",
      cCalendarList,
      userId,
    );

    const sync = await reInitSyncByIntegration(
      "google",
      userId,
      cCalendarList,
      calListNextSyncToken,
    );

    const watches = await Promise.resolve(isUsingHttps()).then((yes) =>
      yes
        ? syncService.startWatchingGcalResources(
            userId,
            [
              { gCalendarId: Resource_Sync.CALENDAR },
              ...gCalendarIds.map((gCalendarId) => ({ gCalendarId })),
            ],
            gcal,
          )
        : [],
    );

    await syncService.importFull(gcal, gCalendarIds, userId);

    return { calendarlist, watches, events: "success", sync };
  };

  /*
   * updateUserMetadata
   *
   * Nested objects and all lower-level properties
   * will merge with existing ones.
   *
   * @memberOf UserService
   */
  updateUserMetadata = async ({
    userId,
    data,
  }: {
    userId: string;
    data: Partial<UserMetadata>;
  }): Promise<UserMetadata> => {
    const value = await this.fetchUserMetadata(userId);
    const update = mergeWith(value, data);

    const { status, metadata } =
      await SupertokensUserMetadata.updateUserMetadata(userId, update);

    if (status !== "OK") throw new Error("Failed to update user metadata");

    return metadata;
  };

  fetchUserMetadata = async (
    userId: string,
    userContext?: Record<string, JSONObject>,
  ): Promise<UserMetadata> => {
    const { status, metadata } = await SupertokensUserMetadata.getUserMetadata(
      userId,
      userContext,
    );

    if (status !== "OK") throw new Error("Failed to fetch user metadata");

    return metadata;
  };
}

export default new UserService();
