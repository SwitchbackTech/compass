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

  /**
   * Deletes a user's events sourced from a provider's calendars (B9: Google
   * revoke prunes events whose owning calendar has source.provider ===
   * "google"; local events are untouched). The rest of the revoke
   * flow (archiving the calendars with isActive: false, dropping watches,
   * clearing tokens) lives in userService.pruneGoogleData; this method only
   * covers the event rows.
   */
  deleteByIntegration = async (
    integration: "google",
    userId: string,
    session?: ClientSession,
  ) => {
    const calendars = await calendarService.list(userId);
    const providerCalendarIds = calendars
      .filter((c) => c.source.provider === integration)
      .map((c) => c._id);

    return eventRepository.deleteByCalendarIds(providerCalendarIds, session);
  };
}

const eventService = new EventService();

export default eventService;
