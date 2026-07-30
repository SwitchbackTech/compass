import { type ClientSession, type ObjectId } from "mongodb";
import mongoService from "@backend/common/services/mongo.service";

/**
 * Single owner of Mongo access for the event collection (B2). Ownership is
 * always proven through the calendar: callers pass the set of calendarIds
 * the requesting user owns (resolved via the calendar collection), never a
 * bare user id and never a client-supplied provider id.
 */
class EventRepository {
  async deleteByCalendarIds(
    calendarIds: ObjectId[],
    session?: ClientSession,
  ): Promise<{ deletedCount: number }> {
    if (calendarIds.length === 0) return { deletedCount: 0 };
    const result = await mongoService.event.deleteMany(
      { calendarId: { $in: calendarIds } },
      { session },
    );
    return { deletedCount: result.deletedCount };
  }
}

export const eventRepository = new EventRepository();
