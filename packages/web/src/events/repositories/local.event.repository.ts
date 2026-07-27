import { DateTimeSchema, type EventId } from "@core/types/domain-primitives";
import { type Event } from "@core/types/event.contracts";
import {
  type CreateEventInput,
  type EventListQuery,
  type RecurrenceScope,
  type ReplaceEventInput,
} from "@core/types/event-command.contracts";
import dayjs from "@core/util/date/dayjs";
import { getLocalCalendarSentinelId } from "@web/calendars/local-calendar.sentinel";
import {
  getOfflineDataStore,
  type OfflineDataStore,
} from "@web/common/storage/offline-data/offline-data.store.registry";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { expandLocalEventRecords } from "@web/events/recurrence/expandLocalEventRecords";
import { parseOccurrenceId } from "@web/events/recurrence/projectRecurringEdit";
import { type LocalEventRecord } from "@web/events/types/local-event.record";
import { type EventRepository } from "./event.repository.types";

/**
 * Local event repository implementation using the offline data store.
 *
 * Local (IndexedDB) mode stores one record per series and expands occurrences
 * at read time (expandLocalEventRecords), so an occurrence id is a composed
 * `${seriesId}::${start}` with no record of its own. Scoped writes against
 * such an id are applied to the series record, mirroring the backend's plans:
 * exclude the date ("this" delete), truncate the rules with UNTIL
 * ("thisAndFollowing"), or rewrite/delete the whole record ("all"). Series-
 * wide edits don't clean up previously stored occurrence overrides — those
 * keep their edited state until deleted individually.
 */
function nowDateTime() {
  return DateTimeSchema.parse(new Date().toISOString());
}

// RRULE UNTIL is inclusive, so truncating "everything at/after `start`" means
// UNTIL = one second (timed) or one day (all-day) before it, matching the
// backend's withUntil semantics. Any existing COUNT/UNTIL bound is replaced.
function truncateRules(
  rules: readonly string[],
  beforeStart: string,
): string[] {
  const until = beforeStart.includes("T")
    ? dayjs(beforeStart)
        .subtract(1, "second")
        .utc()
        .format("YYYYMMDD[T]HHmmss[Z]")
    : dayjs(beforeStart).subtract(1, "day").format("YYYYMMDD");

  return rules.map((rule) => {
    if (!rule.startsWith("RRULE:")) return rule;
    const kept = rule
      .slice("RRULE:".length)
      .split(";")
      .filter(
        (part) => !part.startsWith("UNTIL=") && !part.startsWith("COUNT="),
      );
    return `RRULE:${[...kept, `UNTIL=${until}`].join(";")}`;
  });
}

export class LocalEventRepository implements EventRepository {
  constructor(
    private readonly getStore: () => OfflineDataStore = getOfflineDataStore,
  ) {}

  private get store() {
    return this.getStore();
  }

  async list(query: EventListQuery): Promise<Event[]> {
    const records = await this.store.getAllEvents();
    return expandLocalEventRecords(records, {
      start: query.start,
      end: query.end,
    }).map((record) => record.event);
  }

  private async findRecordById(
    id: string,
  ): Promise<LocalEventRecord | undefined> {
    const records = await this.store.getAllEvents();
    return records.find((r) => r.id === id);
  }

  /** The stored series record behind a composed occurrence id, if any. */
  private async findSeriesRecord(
    id: EventId,
  ): Promise<{ record: LocalEventRecord; occurrenceStart: string } | null> {
    const parsed = parseOccurrenceId(id);
    if (!parsed) return null;
    const record = await this.findRecordById(parsed.seriesId);
    if (!record || record.event.recurrence.kind !== "series") return null;
    return { record, occurrenceStart: parsed.start };
  }

  async getById(id: EventId): Promise<Event> {
    const record = await this.findRecordById(id);
    if (!record) {
      throw new Error(`Event not found: ${id}`);
    }
    return record.event;
  }

  async create(input: CreateEventInput): Promise<Event> {
    const id = input.id ?? (createObjectIdString() as EventId);
    const now = nowDateTime();

    const event: Event = {
      id,
      calendarId: input.calendarId,
      content: input.content,
      schedule: input.schedule,
      recurrence:
        input.recurrence.kind === "series"
          ? { kind: "series", rules: input.recurrence.rules }
          : { kind: "single" },
      createdAt: now,
      updatedAt: null,
    };

    const record: LocalEventRecord = { version: 2, id, event, isDemo: false };
    await this.store.putEvent(record);
    return event;
  }

  async replace(id: EventId, input: ReplaceEventInput): Promise<Event> {
    if (input.scope !== "this") {
      const series = await this.findSeriesRecord(id);
      if (series) {
        return this.replaceSeries(series.record, series.occurrenceStart, input);
      }
    }

    // The optimistic layer resolves the edit target from the react-query
    // cache, which can hold an event that never made it into IndexedDB - most
    // commonly an expanded recurring-occurrence instance (its composed id has
    // no stored record). Rather than throwing "Event not found" on that
    // mismatch, upsert: persist the edit so an offline change isn't lost
    // (read-time expansion then defers to this record for its date), falling
    // back to the local calendar when the input carries no calendarId.
    const existingRecord = await this.findRecordById(id);
    const existing = existingRecord?.event;

    const recurrence =
      input.recurrence.kind === "preserve"
        ? (existing?.recurrence ?? { kind: "single" as const })
        : input.recurrence.kind === "series"
          ? { kind: "series" as const, rules: input.recurrence.rules }
          : { kind: "single" as const };

    const event: Event = {
      id,
      calendarId:
        input.calendarId ??
        existing?.calendarId ??
        getLocalCalendarSentinelId(),
      content: input.content,
      schedule: input.schedule,
      recurrence,
      createdAt: existing?.createdAt ?? nowDateTime(),
      updatedAt: nowDateTime(),
    };

    const record: LocalEventRecord = {
      version: 2,
      id,
      event,
      isDemo: existingRecord?.isDemo ?? false,
    };
    await this.store.putEvent(record);
    return event;
  }

  private async replaceSeries(
    record: LocalEventRecord,
    occurrenceStart: string,
    input: ReplaceEventInput,
  ): Promise<Event> {
    // A "thisAndFollowing" edit of the first occurrence covers the whole
    // series - same upgrade the backend applies.
    const splits =
      input.scope === "thisAndFollowing" &&
      dayjs(occurrenceStart).isAfter(record.event.schedule.start);

    const recurrence: Event["recurrence"] =
      input.recurrence.kind === "series"
        ? { kind: "series", rules: input.recurrence.rules }
        : input.recurrence.kind === "single"
          ? { kind: "single" }
          : record.event.recurrence;

    if (!splits) {
      const event: Event = {
        ...record.event,
        calendarId: input.calendarId ?? record.event.calendarId,
        content: input.content,
        schedule: input.schedule,
        recurrence,
        updatedAt: nowDateTime(),
      };
      await this.store.putEvent({ ...record, event });
      return event;
    }

    const truncated: Event = {
      ...record.event,
      recurrence: {
        kind: "series",
        rules: truncateRules(
          record.event.recurrence.kind === "series"
            ? record.event.recurrence.rules
            : [],
          occurrenceStart,
        ),
      },
      updatedAt: nowDateTime(),
    };
    await this.store.putEvent({ ...record, event: truncated });

    const id = `${record.id}::${occurrenceStart}` as EventId;
    const event: Event = {
      id,
      calendarId: input.calendarId ?? record.event.calendarId,
      content: input.content,
      schedule: input.schedule,
      recurrence,
      createdAt: nowDateTime(),
      updatedAt: null,
    };
    await this.store.putEvent({
      version: 2,
      id,
      event,
      isDemo: record.isDemo,
    });
    return event;
  }

  async delete(id: EventId, scope: RecurrenceScope): Promise<void> {
    const series = await this.findSeriesRecord(id);
    if (!series) {
      await this.store.deleteEvent(id);
      return;
    }
    const { record, occurrenceStart } = series;

    const coversWholeSeries =
      scope === "all" ||
      (scope === "thisAndFollowing" &&
        !dayjs(occurrenceStart).isAfter(record.event.schedule.start));
    if (coversWholeSeries) {
      await this.store.deleteEvent(record.id);
      return;
    }

    if (scope === "thisAndFollowing") {
      await this.store.putEvent({
        ...record,
        event: {
          ...record.event,
          recurrence: {
            kind: "series",
            rules: truncateRules(
              record.event.recurrence.kind === "series"
                ? record.event.recurrence.rules
                : [],
              occurrenceStart,
            ),
          },
          updatedAt: nowDateTime(),
        },
      });
      return;
    }

    // "this": exclude the date from expansion, and drop any stored override
    // record for this occurrence so it can't resurface via the id dedupe.
    await this.store.deleteEvent(id);
    await this.store.putEvent({
      ...record,
      exdates: [...(record.exdates ?? []), occurrenceStart],
    });
  }
}
