import { TokenPayload } from "google-auth-library";
import { mapUserToCompass } from "@core/mappers/map.user";
import { Priorities } from "@core/constants/core.constants";
import { colorNameByPriority } from "@core/constants/colors";
import { UserInfo_Google } from "@core/types/auth.types";
import { Logger } from "@core/logger/winston.logger";
import mongoService from "@backend/common/services/mongo.service";
import { Collections } from "@backend/common/constants/collections";
import { AuthError, error } from "@backend/common/errors/types/backend.errors";
import { getCalendarsToSync } from "@backend/auth/services/auth.utils";
import priorityService from "@backend/priority/services/priority.service";
import calendarService from "@backend/calendar/services/calendar.service";
import eventService from "@backend/event/services/event.service";
import syncService from "@backend/sync/services/sync.service";
import { gCalendar } from "@core/types/gcal";

const logger = Logger("app:user.service");

class UserService {
  createUser = async (
    gUser: UserInfo_Google["gUser"],
    gRefreshToken: string
  ) => {
    const _compassUser = mapUserToCompass(gUser, gRefreshToken);
    const compassUser = { ..._compassUser, signedUpAt: new Date() };

    const createUserRes = await mongoService.db
      .collection(Collections.USER)
      .insertOne(compassUser);

    const userId = createUserRes.insertedId.toString();
    if (!userId) {
      throw error(AuthError.UserCreateFailed, "Failed to create Compass user");
    }

    return userId;
  };

  deleteUser = async (userId: string) => {
    logger.info(`Deleting all data for user: ${userId}`);

    const filter = { _id: mongoService.objectId(userId) };
    const response = await mongoService.db
      .collection(Collections.USER)
      .deleteOne(filter);
    return response;
  };

  initCalendars = async (gcal: gCalendar, userId: string) => {
    const { cCalendarList, gCalendarIds, nextSyncToken } =
      await getCalendarsToSync(gcal, userId);

    await calendarService.create(cCalendarList);

    await syncService.updateSyncToken(userId, "calendarlist", nextSyncToken);

    const eventWatches = gCalendarIds.map((gCalId) =>
      syncService.startWatchingEvents(gcal, userId, gCalId)
    );

    await Promise.all(eventWatches);

    return gCalendarIds;
  };

  initEvents = async (
    gcal: gCalendar,
    gCalendarIds: string[],
    userId: string
  ) => {
    const eventImports = gCalendarIds.map(async (gCalId) => {
      const { nextSyncToken } = await eventService.importClean(
        userId,
        gcal,
        gCalId
      );
      await syncService.updateEventsSyncToken(userId, gCalId, nextSyncToken);
    });

    await Promise.all(eventImports);
  };

  initUserData = async (
    gUser: TokenPayload,
    gcalClient: gCalendar,
    gRefreshToken: string
  ) => {
    const userId = await this.createUser(gUser, gRefreshToken);
    await this.createDefaultPriorities(userId);

    const gCalendarIds = await this.initCalendars(gcalClient, userId);

    const temp = await this.initEvents(gcalClient, gCalendarIds, userId);

    return userId;
  };

  createDefaultPriorities = async (userId: string) => {
    return priorityService.create(userId, [
      {
        color: colorNameByPriority.unassigned,
        name: Priorities.UNASSIGNED,
        user: userId,
      },
      {
        color: colorNameByPriority.self,
        name: Priorities.SELF,
        user: userId,
      },
      {
        color: colorNameByPriority.work,
        name: Priorities.WORK,
        user: userId,
      },
      {
        color: colorNameByPriority.relationships,
        name: Priorities.RELATIONS,
        user: userId,
      },
    ]);
  };

  saveTimeFor = async (label: "lastLoggedInAt", userId: string) => {
    const res = await mongoService.db
      .collection(Collections.USER)
      .findOneAndUpdate(
        { _id: mongoService.objectId(userId) },
        { $set: { [label]: new Date() } }
      );

    return res;
  };
}

export default new UserService();
