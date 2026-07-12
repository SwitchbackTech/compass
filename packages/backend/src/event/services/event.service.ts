import { type ClientSession, ObjectId } from "mongodb";
import { getCalendarCapabilities } from "@core/types/calendar.contracts";
import { type CalendarId, type EventId } from "@core/types/domain-primitives";
import {
  type CreateEventInput,
  type DeleteEventInput,
  type EventListQuery,
  type ReorderEventsInput,
  type ReplaceEventInput,
  type TransitionEventInput,
} from "@core/types/event-command.contracts";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import calendarService from "@backend/calendar/services/calendar.service";
import mongoService from "@backend/common/services/mongo.service";
import {
  executeDelete,
  executeMutation,
} from "@backend/event/classes/compass.event.executor";
import {
  generateDelete,
  generateReplace,
  generateTransition,
} from "@backend/event/classes/compass.event.generator";
import {
  analyzeDelete,
  analyzeReplace,
  analyzeTransition,
  type SeriesContext,
} from "@backend/event/classes/compass.event.parser";
import { eventMutationError } from "@backend/event/event.error";
import { type EventRecord } from "@backend/event/event.record";
import { mapCreateInput } from "@backend/event/event.record.mapper";
import { eventRepository } from "@backend/event/event.repository";
import { getAnchorDate } from "@backend/event/services/recur/util/recur.util";
import { sseServer } from "@backend/servers/sse/sse.server";
import { CompassToGoogleEventPropagation } from "@backend/sync/services/event-propagation/compass-to-google/compass-to-google.event-propagation";

const notify = (
  userId: string,
  records: EventRecord[],
  reason: "created" | "updated" | "deleted",
): void => {
  const byCalendar = new Map<string, EventId[]>();
  for (const record of records) {
    const calendarId = record.calendarId.toHexString();
    const ids = byCalendar.get(calendarId) ?? [];
    ids.push(record._id.toHexString() as EventId);
    byCalendar.set(calendarId, ids);
  }
  for (const [calendarId, eventIds] of byCalendar) {
    sseServer.publishEventsChanged(userId, {
      calendarId: calendarId as CalendarId,
      eventIds,
      reason,
    });
  }
};

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

class EventService {
  private async ownedCalendarIds(userId: string): Promise<ObjectId[]> {
    const calendars = await calendarService.list(userId);
    return calendars.filter((c) => c.isActive).map((c) => c._id);
  }

  /**
   * Resolves a calendar the user owns and is currently active, and enforces
   * write capability derived from its access role (packet 05 step 6):
   * reader/freeBusyReader calendars must reject mutations before any
   * optimistic write reaches Google.
   */
  private async requireWritableCalendar(
    userId: string,
    calendarId: ObjectId | string,
  ): Promise<CalendarRecord> {
    const calendar = await calendarService.getOwnedActiveCalendar(
      userId,
      calendarId,
    );
    if (!calendar) {
      throw eventMutationError("CALENDAR_NOT_FOUND", "Calendar not found");
    }
    if (!getCalendarCapabilities(calendar.access).canWrite) {
      throw eventMutationError(
        "CALENDAR_READ_ONLY",
        "Calendar does not permit writes",
      );
    }
    return calendar;
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

  private async withEventTransaction(
    run: (session: ClientSession) => Promise<unknown>,
  ): Promise<void> {
    const session = await mongoService.startSession();
    try {
      await session.withTransaction(run);
    } finally {
      await session.endSession();
    }
  }

  private async seriesContext(
    event: EventRecord,
    ownedCalendarIds: ObjectId[],
  ): Promise<SeriesContext | null> {
    if (event.recurrence.kind === "occurrence") {
      const base = await eventRepository.findById(
        event.recurrence.seriesId,
        ownedCalendarIds,
      );
      if (!base) {
        throw eventMutationError(
          "EVENT_NOT_FOUND",
          "Series base not found for occurrence",
        );
      }
      const instances = await eventRepository.findBySeriesId(base._id);
      return { base, instances: instances.filter((i) => i._id !== event._id) };
    }

    if (event.recurrence.kind === "series") {
      const instances = await eventRepository.findBySeriesId(event._id);
      return { base: event, instances };
    }

    return null;
  }

  readAll = async (
    userId: string,
    query: EventListQuery,
  ): Promise<EventRecord[]> => {
    const ownedCalendarIds = await this.ownedCalendarIds(userId);
    return eventRepository.list(query, ownedCalendarIds);
  };

  readById = async (userId: string, eventId: string): Promise<EventRecord> => {
    return this.requireOwnedEvent(userId, eventId);
  };

  create = async (
    userId: string,
    input: CreateEventInput,
  ): Promise<EventRecord> => {
    await this.requireWritableCalendar(userId, input.calendarId);

    if (input.id) {
      const existing = await mongoService.event.findOne({
        _id: new ObjectId(input.id),
      });
      if (existing) {
        throw eventMutationError(
          "DUPLICATE_EVENT_ID",
          `Event with id ${input.id} already exists`,
        );
      }
    }

    const base = mapCreateInput(input, { now: new Date() });
    const materialized =
      base.recurrence.kind === "series"
        ? generateReplace({
            kind: "replaceSeries",
            updatedBase: base,
            deleteInstanceIds: [],
          })
        : { upsert: [base], deleteIds: [], primary: base };

    await this.withEventTransaction((session) =>
      executeMutation(materialized, session),
    );

    await CompassToGoogleEventPropagation.propagate(userId, {
      upserted: materialized.upsert,
      deletedBefore: [],
    });
    notify(userId, [materialized.primary], "created");

    return materialized.primary;
  };

  replace = async (
    userId: string,
    eventId: string,
    input: ReplaceEventInput,
  ): Promise<EventRecord> => {
    const target = await this.requireOwnedEvent(userId, eventId);
    await this.requireWritableCalendar(userId, target.calendarId);
    const ownedCalendarIds = await this.ownedCalendarIds(userId);
    const series = await this.seriesContext(target, ownedCalendarIds);
    const plan = analyzeReplace(target, series, input, new Date());
    const materialized = generateReplace(plan);
    const deletedBefore = [target, ...(series?.instances ?? [])].filter(
      (record) => materialized.deleteIds.some((id) => id.equals(record._id)),
    );

    // Google's originalStartTime is an occurrence's fixed position in the
    // recurrence pattern -- it never moves even after the instance's own
    // start/end are later edited. When this same replace() call is what's
    // editing `target`'s schedule, `target` (the pre-edit record) still
    // carries the true original anchor; anything derived from `plan`/
    // `materialized` after this point already reflects the NEW schedule and
    // would search Google's events.instances at the wrong position (packet
    // 05 step 4). Only occurrences need this -- a base/single/someday event
    // resolves by its own externalReference, no instances lookup involved.
    const originalStartByEventId =
      target.recurrence.kind === "occurrence" &&
      target.schedule.kind !== "someday"
        ? new Map([[target._id.toHexString(), getAnchorDate(target.schedule)]])
        : undefined;

    await this.withEventTransaction((session) =>
      executeMutation(materialized, session),
    );

    await CompassToGoogleEventPropagation.propagate(userId, {
      upserted: materialized.upsert,
      deletedBefore,
      originalStartByEventId,
    });
    notify(userId, [materialized.primary], "updated");

    return materialized.primary;
  };

  delete = async (
    userId: string,
    eventId: string,
    input: DeleteEventInput,
  ): Promise<void> => {
    const target = await this.requireOwnedEvent(userId, eventId);
    await this.requireWritableCalendar(userId, target.calendarId);
    const ownedCalendarIds = await this.ownedCalendarIds(userId);
    const series = await this.seriesContext(target, ownedCalendarIds);
    const plan = analyzeDelete(target, series, input);
    const materialized = generateDelete(plan);
    const allSeriesRecords = series ? [series.base, ...series.instances] : [];
    const candidates = materialized.deleteSeriesId
      ? [target, ...allSeriesRecords]
      : [target, ...allSeriesRecords].filter((record) =>
          materialized.deleteIds.some((id) => id.equals(record._id)),
        );
    const deletedBefore = [
      ...new Map(candidates.map((r) => [r._id.toHexString(), r])).values(),
    ];

    await this.withEventTransaction((session) =>
      executeDelete(materialized, session),
    );

    await CompassToGoogleEventPropagation.propagate(userId, {
      upserted: materialized.upsert,
      deletedBefore,
    });
    notify(userId, deletedBefore, "deleted");
  };

  transition = async (
    userId: string,
    eventId: string,
    input: TransitionEventInput,
  ): Promise<EventRecord> => {
    const target = await this.requireOwnedEvent(userId, eventId);

    let targetCalendarId: ObjectId | null = null;
    if (input.kind === "schedule") {
      const calendar = await this.requireWritableCalendar(
        userId,
        input.targetCalendarId,
      );
      targetCalendarId = calendar._id;
    } else {
      const local = await calendarService.getLocalCalendar(userId);
      if (!local) {
        throw eventMutationError(
          "CALENDAR_NOT_FOUND",
          "Local calendar not found",
        );
      }
      targetCalendarId = local._id;
    }

    const plan = analyzeTransition(target, input, targetCalendarId, new Date());
    const materialized = generateTransition(plan);

    await this.withEventTransaction((session) =>
      executeMutation(materialized, session),
    );

    // "schedule" needs a provider copy created on the target calendar;
    // "unschedule" needs the old provider copy deleted (B7/B16). The old
    // externalReference already lived on `target`, so the pre-transition
    // record — not the moved one — is what carries the id to delete.
    await CompassToGoogleEventPropagation.propagate(userId, {
      upserted: plan.kind === "schedule" ? [materialized.primary] : [],
      deletedBefore: plan.kind === "unschedule" ? [target] : [],
    });
    notify(userId, [target, materialized.primary], "updated");

    return materialized.primary;
  };

  reorder = async (
    userId: string,
    input: ReorderEventsInput,
  ): Promise<void> => {
    const ownedCalendarIds = await this.ownedCalendarIds(userId);
    const ownedEvents = await eventRepository.findByIds(
      input.items.map((i) => i.eventId),
      ownedCalendarIds,
    );
    const ownedIds = new Set(ownedEvents.map((e) => e._id.toHexString()));
    const allOwnedSomeday = input.items.every(({ eventId }) => {
      if (!ownedIds.has(eventId)) return false;
      const event = ownedEvents.find((e) => e._id.toHexString() === eventId);
      return (
        event?.schedule.kind === "someday" &&
        event.schedule.period === input.period
      );
    });

    if (!allOwnedSomeday) {
      throw eventMutationError(
        "EVENT_NOT_FOUND",
        "Every reordered event must be a someday event owned by the user in the given period",
      );
    }

    await eventRepository.reorder(input.items, ownedCalendarIds);
  };

  deleteAllByUser = async (userId: string, session?: ClientSession) => {
    const ownedCalendarIds = await this.ownedCalendarIds(userId);
    return eventRepository.deleteByCalendarIds(ownedCalendarIds, session);
  };

  /**
   * Deletes a user's events sourced from a provider's calendars (B9: Google
   * revoke prunes events whose owning calendar has source.provider ===
   * "google"; local/someday events are untouched). The rest of the revoke
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
