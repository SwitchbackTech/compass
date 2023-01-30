import { TokenPayload } from "google-auth-library";
import { mapUserToCompass } from "@core/mappers/map.user";
import { UserInfo_Google } from "@core/types/auth.types";
import { Logger } from "@core/logger/winston.logger";
import { gCalendar } from "@core/types/gcal";
import { BaseError } from "@core/errors/errors.base";
import { Summary_Delete } from "@scripts/commands/delete";
import { AuthError, error } from "@backend/common/errors/types/backend.errors";
import compassAuthService from "@backend/auth/services/compass.auth.service";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import { initSync } from "@backend/sync/services/sync.service.helpers";
import mongoService from "@backend/common/services/mongo.service";
import priorityService from "@backend/priority/services/priority.service";
import calendarService from "@backend/calendar/services/calendar.service";
import syncService from "@backend/sync/services/sync.service";
import eventService from "@backend/event/services/event.service";

const logger = Logger("app:user.service");

class UserService {
  createUser = async (
    gUser: UserInfo_Google["gUser"],
    gRefreshToken: string
  ) => {
    const _compassUser = mapUserToCompass(gUser, gRefreshToken);
    const compassUser = { ..._compassUser, signedUpAt: new Date() };

    const createUserRes = await mongoService.user.insertOne(compassUser);

    const userId = createUserRes.insertedId.toString();
    if (!userId) {
      throw error(AuthError.NoUserId, "Failed to create Compass user");
    }

    return userId;
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

      const syncs = await syncService.deleteAllByUser(userId);
      summary.syncs = syncs.deletedCount;

      initSupertokens();
      const { sessionsRevoked } = await compassAuthService.revokeSessionsByUser(
        userId
      );
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

  initUserData = async (
    gUser: TokenPayload,
    gcalClient: gCalendar,
    gRefreshToken: string
  ) => {
    const userId = await this.createUser(gUser, gRefreshToken);

    const gCalendarIds = await initSync(gcalClient, userId);

    await syncService.importFull(gcalClient, gCalendarIds, userId);

    await priorityService.createDefaultPriorities(userId);

    await eventService.createDefaultSomeday(userId);

    return userId;
  };

  saveTimeFor = async (label: "lastLoggedInAt", userId: string) => {
    const res = await mongoService.user.findOneAndUpdate(
      { _id: mongoService.objectId(userId) },
      { $set: { [label]: new Date() } }
    );

    return res;
  };
}

export default new UserService();
