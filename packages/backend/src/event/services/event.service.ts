import { type ClientSession } from "mongodb";
import calendarService from "@backend/calendar/services/calendar.service";
import { eventRepository } from "@backend/event/event.repository";

class EventService {
  /**
   * Every calendar the user owns, archived ones included. Archiving (a
   * calendar that vanished from Google's list, or a Google revoke) leaves
   * the calendar's events in place, and an event document records only its
   * `calendarId` - never a user. So an active-only delete would strand those
   * events the moment the calendar row goes, with nothing left to find them
   * by.
   */
  deleteAllByUser = async (userId: string, session?: ClientSession) => {
    const calendars = await calendarService.list(userId, session);
    const calendarIds = calendars.map((calendar) => calendar._id);
    return eventRepository.deleteByCalendarIds(calendarIds, session);
  };
}

const eventService = new EventService();

export default eventService;
