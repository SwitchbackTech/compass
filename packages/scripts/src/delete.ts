import eventService from "@backend/event/services/event.service";
import priorityService from "@backend/priority/services/priority.service";
import { findCompassUserBy } from "@backend/user/queries/user.queries";
import calendarService from "@backend/calendar/services/calendar.service";
import userService from "@backend/user/services/user.service";
import syncService from "@backend/sync/services/sync.service";

interface Summary_Delete {
  calendarlist?: number;
  events?: number;
  eventWatches?: number;
  priorities?: number;
  syncs?: number;
  user?: number;
}

export const deleteAllCompassDataForUser = async (user: string) => {
  const summary: Summary_Delete = {};

  const isGmail = user.includes("@gmail.com");
  const idKeyword = isGmail ? "email" : "_id";

  const { user: userRecord } = await findCompassUserBy(idKeyword, user);
  const userId = idKeyword === "_id" ? user : userRecord?._id.toString();

  const priorities = await priorityService.deleteAllByUser(userId);
  summary.priorities = priorities.deletedCount;

  const calendars = await calendarService.deleteAllByUser(userId);
  summary.calendarlist = calendars.deletedCount;

  const events = await eventService.deleteAllByUser(userId);
  summary.events = events.deletedCount;

  const { watches } = (await syncService.stopAllChannelWatches(userId)) as {
    watches: string[];
  };
  summary.eventWatches = watches?.length || 0;

  const syncs = await syncService.deleteAllByUser(userId);
  summary.syncs = syncs.deletedCount;

  const _user = await userService.deleteUser(userId);
  summary.user = _user.deletedCount;

  console.log(`Deleted: ${JSON.stringify(summary, null, 2)}`);
};
