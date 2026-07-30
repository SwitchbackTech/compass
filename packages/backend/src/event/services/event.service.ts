import { type ClientSession, type ObjectId } from "mongodb";
import calendarService from "@backend/calendar/services/calendar.service";
import { eventMutationError } from "@backend/event/event.error";
import { type EventRecord } from "@backend/event/event.record";
import { eventRepository } from "@backend/event/event.repository";

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

class EventService {
  private async ownedCalendarIds(userId: string): Promise<ObjectId[]> {
    const calendars = await calendarService.list(userId);
    return calendars.filter((c) => c.isActive).map((c) => c._id);
  }

  private async requireOwnedEvent(
    userId: string,
    eventId: string,
  ): Promise<EventRecord> {
    if (!OBJECT_ID_PATTERN.test(eventId)) {
      throw eventMutationError("EVENT_NOT_FOUND", "Invalid event id");
    }

    const ownedCalendarIds = await this.ownedCalendarIds(userId);
    const event = await eventRepository.findById(eventId, ownedCalendarIds);

    if (!event) {
      throw eventMutationError("EVENT_NOT_FOUND", "Event not found");
    }

    return event;
  }

  readById = async (userId: string, eventId: string): Promise<EventRecord> => {
    return this.requireOwnedEvent(userId, eventId);
  };

  /**
   * Wider than `ownedCalendarIds` on purpose: every calendar the user owns,
   * archived ones included. Archiving (a calendar that vanished from Google's
   * list, or a Google revoke) leaves the calendar's events in place, and an
   * event document records only its `calendarId` - never a user. So an
   * active-only delete would strand those events the moment the calendar row
   * goes, with nothing left to find them by.
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
