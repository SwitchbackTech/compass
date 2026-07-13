import { DateTimeSchema, type EventId } from "@core/types/domain-primitives";
import { type Event } from "@core/types/event.contracts";
import {
  type CreateEventInput,
  type EventListQuery,
  type RecurrenceScope,
  type ReplaceEventInput,
} from "@core/types/event-command.contracts";
import {
  getOfflineDataStore,
  type OfflineDataStore,
} from "@web/common/storage/offline-data/offline-data.store.registry";
import { type LocalEventRecord } from "@web/common/storage/types/local-event.record";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
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

  private async getRecordById(id: EventId): Promise<LocalEventRecord> {
    const records = await this.store.getAllEvents();
    const record = records.find((r) => r.id === id);
    if (!record) {
      throw new Error(`Event not found: ${id}`);
    }
    return record;
  }

  async getById(id: EventId): Promise<Event> {
    return (await this.getRecordById(id)).event;
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
      priority: input.priority,
      createdAt: now,
      updatedAt: null,
    };

    const record: LocalEventRecord = { version: 2, id, event, isDemo: false };
    await this.store.putEvent(record);
    return event;
  }

  async replace(id: EventId, input: ReplaceEventInput): Promise<Event> {
    const existingRecord = await this.getRecordById(id);
    const existing = existingRecord.event;

    const recurrence =
      input.recurrence.kind === "preserve"
        ? existing.recurrence
        : input.recurrence.kind === "series"
          ? { kind: "series" as const, rules: input.recurrence.rules }
          : { kind: "single" as const };

    const event: Event = {
      ...existing,
      content: input.content,
      schedule: input.schedule,
      recurrence,
      priority: input.priority,
      updatedAt: nowDateTime(),
    };

    const record: LocalEventRecord = {
      version: 2,
      id,
      event,
      isDemo: existingRecord.isDemo,
    };
    await this.store.putEvent(record);
    return event;
  }

  async delete(id: EventId, _scope: RecurrenceScope): Promise<void> {
    await this.store.deleteEvent(id);
  }
}
