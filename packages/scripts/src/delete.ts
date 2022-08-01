import eventService from "@backend/event/services/event.service";
import priorityService from "@backend/priority/services/priority.service";
import { findCompassUsersBy } from "@backend/user/queries/user.queries";
import calendarService from "@backend/calendar/services/calendar.service";
import userService from "@backend/user/services/user.service";
import syncService from "@backend/sync/services/sync.service";
import { BaseError } from "@core/errors/errors.base";

export interface Summary_Delete {
  calendarlist?: number;
  events?: number;
  eventWatches?: number;
  priorities?: number;
  syncs?: number;
  user?: number;
}

const deleteCompassDataForUser = async (userId: string) => {
  const summary: Summary_Delete = {};
  try {
    const priorities = await priorityService.deleteAllByUser(userId);
    summary.priorities = priorities.deletedCount;

    const calendars = await calendarService.deleteAllByUser(userId);
    summary.calendarlist = calendars.deletedCount;

    const events = await eventService.deleteAllByUser(userId);
    summary.events = events.deletedCount;

    const { watchStopCount } = await syncService.stopAllGcalEventWatches(
      userId
    );
    summary.eventWatches = watchStopCount;

    const syncs = await syncService.deleteAllByUser(userId);
    summary.syncs = syncs.deletedCount;

    const _user = await userService.deleteUser(userId);
    summary.user = _user.deletedCount;

    return summary;
  } catch (e) {
    const _e = e as BaseError;
    console.log("Stopped early because:", _e.description);
    return summary;
  }
};

export const deleteCompassDataForMatchingUsers = async (user: string) => {
  console.log(`Deleting Compass data for users matching: ${user}`);

  const isGmail = user.includes("@gmail.com");
  const idKeyword = isGmail ? "email" : "_id";

  const users = await findCompassUsersBy(idKeyword, user);

  const totalSummary: Summary_Delete[] = [];
  for (const user of users) {
    const userId = user?._id.toString();
    const summary = await deleteCompassDataForUser(userId);
    totalSummary.push(summary);
  }

  console.log(`Deleted: ${JSON.stringify(totalSummary, null, 2)}`);
};
