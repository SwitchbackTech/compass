import { type ClientSession, ObjectId } from "mongodb";
import { getCalendarCapabilities } from "@core/types/calendar.contracts";
import { type CalendarId, type EventId } from "@core/types/domain-primitives";
import {
  type CreateEventInput,
  type DeleteEventInput,
  type EventListQuery,
  type ReplaceEventInput,
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
} from "@backend/event/classes/compass.event.generator";
import {
  analyzeDelete,
  analyzeReplace,
  type ReplacePlan,
  type SeriesContext,
} from "@backend/event/classes/compass.event.parser";
import { eventMutationError } from "@backend/event/event.error";
import { type EventRecord } from "@backend/event/event.record";
import { mapCreateInput } from "@backend/event/event.record.mapper";
import { eventRepository } from "@backend/event/event.repository";
import { getAnchorDate } from "@backend/event/services/recur/util/recur.util";
import { sseServer } from "@backend/servers/sse/sse.server";
import { CompassToGoogleEventPropagation } from "@backend/sync/services/event-propagation/compass-to-google/compass-to-google.event-propagation";

/**
 * Publishes `eventsChanged` once per calendar touched by a mutation, but
 * suppresses the push for calendars the user has hidden (packet 05 step 9):
 * the web has nothing rendered for an invisible calendar, so there's no
 * client-side state for that push to reconcile. A calendar record that can't
 * be found at all (shouldn't happen -- the mutation just touched it) fails
 * open and still publishes, since suppression is only for a confirmed
 * `isVisible: false`, not a lookup gap.
 */
const notify = async (
  userId: string,
  records: EventRecord[],
  reason: "created" | "updated" | "deleted",
): Promise<void> => {
  const byCalendar = new Map<string, EventId[]>();
  for (const record of records) {
    const calendarId = record.calendarId.toHexString();
    const ids = byCalendar.get(calendarId) ?? [];
    ids.push(record._id.toHexString() as EventId);
    byCalendar.set(calendarId, ids);
  }

  const calendarIds = [...byCalendar.keys()].map((id) => new ObjectId(id));
  const visibilityById = new Map<string, boolean>(
    (
      await mongoService.calendar
        .find({ _id: { $in: calendarIds } }, { projection: { isVisible: 1 } })
        .toArray()
    ).map((calendar) => [calendar._id.toHexString(), calendar.isVisible]),
  );

  for (const [calendarId, eventIds] of byCalendar) {
    const isVisible = visibilityById.get(calendarId) ?? true;
    if (!isVisible) continue;

    sseServer.publishEventsChanged(userId, {
      calendarId: calendarId as CalendarId,
      eventIds,
      reason,
    });
  }
};

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

/**
 * Applies a cross-calendar move to the plan's updated record. Only single
 * (non-recurring) events may move (enforced before planning), so the plan is
 * always replaceThis — or replaceSeries with no instances when the caller
 * sent a series scope for a single event; replaceSplit requires an
 * occurrence and can't occur.
 */
const retargetPlanCalendar = (
  plan: ReplacePlan,
  calendarId: ObjectId,
): ReplacePlan => {
  if (plan.kind === "replaceThis") {
    return { ...plan, updated: { ...plan.updated, calendarId } };
  }
  if (plan.kind === "replaceSeries") {
    return { ...plan, updatedBase: { ...plan.updatedBase, calendarId } };
  }
  return plan;
};

class EventService {
  private async ownedCalendarIds(userId: string): Promise<ObjectId[]> {
    const calendars = await calendarService.list(userId);
    return calendars.filter((c) => c.isActive).map((c) => c._id);
  }

  /**
   * Narrower than `ownedCalendarIds`: list reads only ever surface events on
   * calendars the user has left visible (packet 08 step 4). Hiding a
   * calendar is presentation-only (A8) -- it must not affect ownership, so
   * mutation/lookup call sites (requireOwnedEvent, seriesContext, etc.)
   * keep using the wider active-only `ownedCalendarIds` and stay able to
   * edit/delete events on a calendar the user has hidden.
   */
  private async visibleCalendarIds(userId: string): Promise<ObjectId[]> {
    const calendars = await calendarService.list(userId);
    return calendars.filter((c) => c.isActive && c.isVisible).map((c) => c._id);
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
    const visibleCalendarIds = await this.visibleCalendarIds(userId);
    return eventRepository.list(query, visibleCalendarIds);
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
    await notify(userId, [materialized.primary], "created");

    return materialized.primary;
  };

  replace = async (
    userId: string,
    eventId: string,
    input: ReplaceEventInput,
  ): Promise<EventRecord> => {
    const target = await this.requireOwnedEvent(userId, eventId);
    const sourceCalendar = await this.requireWritableCalendar(
      userId,
      target.calendarId,
    );
    // A differing input.calendarId is a cross-calendar move (drag between
    // Day-view columns). Moves supersede A6's calendar-immutability for
    // single events only: a series' materialized instances must stay on the
    // base's calendar, and Google has no per-occurrence move either. Both
    // the pre-image AND the incoming recurrence must be single — otherwise
    // one call could convert-to-series and move at once, recreating the
    // multi-calendar-series states the guard exists to prevent.
    const isMove =
      !!input.calendarId && !target.calendarId.equals(input.calendarId);
    if (
      isMove &&
      (target.recurrence.kind !== "single" ||
        input.recurrence.kind === "series")
    ) {
      throw eventMutationError(
        "RECURRENCE_CONFLICT",
        "Recurring events cannot move between calendars",
      );
    }
    const destinationCalendar = isMove
      ? await this.requireWritableCalendar(userId, input.calendarId!)
      : null;
    // Moving a Google event off Google would mean deleting the Google copy —
    // cancellation emails to every attendee, and attendees/conferencing lost
    // for good if it's ever recreated. Not supported; Google events may only
    // move between Google calendars.
    if (
      destinationCalendar &&
      sourceCalendar.source.provider === "google" &&
      destinationCalendar.source.provider !== "google"
    ) {
      throw eventMutationError(
        "PROVIDER_FAILURE",
        "Google events can only move to another Google calendar",
      );
    }
    const ownedCalendarIds = await this.ownedCalendarIds(userId);
    const series = await this.seriesContext(target, ownedCalendarIds);
    let plan = analyzeReplace(target, series, input, new Date());
    if (destinationCalendar) {
      plan = retargetPlanCalendar(plan, destinationCalendar._id);
    }
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
    // 05 step 4). Only occurrences need this -- a base/single event resolves
    // by its own externalReference, no instances lookup involved.
    const originalStartByEventId =
      target.recurrence.kind === "occurrence"
        ? new Map([[target._id.toHexString(), getAnchorDate(target.schedule)]])
        : undefined;

    await this.withEventTransaction((session) =>
      executeMutation(materialized, session),
    );

    if (destinationCalendar) {
      // The generic propagation would patch the Google copy under the
      // DESTINATION calendar (record.calendarId already points there), where
      // the event doesn't exist yet — moves need Google's events.move first.
      try {
        await CompassToGoogleEventPropagation.propagateCalendarMove(
          userId,
          materialized.primary,
          sourceCalendar,
          destinationCalendar,
        );
      } catch (err) {
        // Google refused the move (e.g. the user isn't the event's
        // organizer). The transaction already committed the new calendarId,
        // so put the record back on the source calendar — otherwise Compass
        // and Google disagree forever and every later edit patches a Google
        // event that isn't on that calendar. The client's settle-time
        // refetch then restores the event to its original column.
        await eventRepository.replaceOne({
          ...materialized.primary,
          calendarId: target.calendarId,
        });
        throw err;
      }
    } else {
      await CompassToGoogleEventPropagation.propagate(userId, {
        upserted: materialized.upsert,
        deletedBefore,
        originalStartByEventId,
      });
    }
    // On a move, notify the source calendar too (via the pre-move `target`)
    // so clients drop the event from the old column as well.
    await notify(
      userId,
      destinationCalendar
        ? [target, materialized.primary]
        : [materialized.primary],
      "updated",
    );

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
    await notify(userId, deletedBefore, "deleted");
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
