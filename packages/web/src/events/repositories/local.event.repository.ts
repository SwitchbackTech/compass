import { DateTimeSchema, type EventId } from "@core/types/domain-primitives";
import { type Event } from "@core/types/event.contracts";
import {
  type CreateEventInput,
  type EventListQuery,
  type RecurrenceScope,
  type ReplaceEventInput,
} from "@core/types/event-command.contracts";
import { getLocalCalendarSentinelId } from "@web/calendars/local-calendar.sentinel";
import {
  getOfflineDataStore,
  type OfflineDataStore,
} from "@web/common/storage/offline-data/offline-data.store.registry";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { type LocalEventRecord } from "@web/events/types/local-event.record";
import { type EventRepository } from "./event.repository.types";

/**
 * Local event repository implementation using the offline data store.
 *
 * Local (IndexedDB) mode never expands recurrence into materialized
 * occurrences the way the backend does, so recurrence scope beyond
 * "which single record" has no local meaning: `replace`/`delete` operate on
 * exactly the record with the given id, regardless of `scope`. This matches
 * the pre-cutover local repository, which also ignored `applyTo` entirely.
 */
function nowDateTime() {
  return DateTimeSchema.parse(new Date().toISOString());
}

export class LocalEventRepository implements EventRepository {
  constructor(
    private readonly getStore: () => OfflineDataStore = getOfflineDataStore,
  ) {}

  private get store() {
    return this.getStore();
  }

  async list(query: EventListQuery): Promise<Event[]> {
    const records = await this.store.getEvents(query);
    return records.map((record) => record.event);
  }

  private async findRecordById(
    id: EventId,
  ): Promise<LocalEventRecord | undefined> {
    const records = await this.store.getAllEvents();
    return records.find((r) => r.id === id);
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
    // The optimistic layer resolves the edit target from the react-query
    // cache, which can hold an event that never made it into IndexedDB - most
    // commonly a materialized recurring-occurrence instance (its id differs
    // from the stored series record). Rather than throwing "Event not found"
    // on that mismatch, upsert: persist the edit so an offline change isn't
    // lost, falling back to the local calendar when the input carries no
    // calendarId of its own.
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

  async delete(id: EventId, _scope: RecurrenceScope): Promise<void> {
    await this.store.deleteEvent(id);
  }
}
