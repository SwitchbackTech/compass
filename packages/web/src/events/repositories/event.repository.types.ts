import { type EventId } from "@core/types/domain-primitives";
import { type Event } from "@core/types/event.contracts";
import {
  type CreateEventInput,
  type EventListQuery,
  type RecurrenceScope,
  type ReplaceEventInput,
} from "@core/types/event-command.contracts";

export interface EventRepository {
  list(query: EventListQuery): Promise<Event[]>;
  getById(id: EventId): Promise<Event>;
  create(input: CreateEventInput): Promise<Event>;
  replace(id: EventId, input: ReplaceEventInput): Promise<Event>;
  delete(id: EventId, scope: RecurrenceScope): Promise<void>;
}
