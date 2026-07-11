import { type EventId } from "@core/types/domain-primitives";
import { type Event } from "@core/types/event.contracts";
import {
  type CreateEventInput,
  type EventListQuery,
  type RecurrenceScope,
  type ReorderEventsInput,
  type ReplaceEventInput,
  type TransitionEventInput,
} from "@core/types/event-command.contracts";
import {
  isBackendUnavailableError,
  markBackendUnavailable,
} from "@web/api/util/backend-unavailable-error.util";
import { EventApi } from "@web/events/event.api";
import { type EventRepository } from "./event.repository.types";
import { LocalEventRepository } from "./local.event.repository";

export class RemoteEventRepository implements EventRepository {
  constructor(
    private readonly api: typeof EventApi = EventApi,
    private readonly localRepository: EventRepository = new LocalEventRepository(),
  ) {}

  private async withLocalFallback<RemoteResult, LocalResult = RemoteResult>(
    remoteOperation: () => Promise<RemoteResult>,
    localOperation: () => Promise<LocalResult>,
  ): Promise<RemoteResult | LocalResult> {
    try {
      return await remoteOperation();
    } catch (error) {
      if (!isBackendUnavailableError(error)) {
        throw error;
      }

      markBackendUnavailable();
      return localOperation();
    }
  }

  async list(query: EventListQuery): Promise<Event[]> {
    return this.withLocalFallback(
      () => this.api.list(query),
      () => this.localRepository.list(query),
    );
  }

  async getById(id: EventId): Promise<Event> {
    return this.withLocalFallback(
      () => this.api.getById(id),
      () => this.localRepository.getById(id),
    );
  }

  async create(input: CreateEventInput): Promise<Event> {
    return this.withLocalFallback(
      () => this.api.create(input),
      () => this.localRepository.create(input),
    );
  }

  async replace(id: EventId, input: ReplaceEventInput): Promise<Event> {
    return this.withLocalFallback(
      () => this.api.replace(id, input),
      () => this.localRepository.replace(id, input),
    );
  }

  async delete(id: EventId, scope: RecurrenceScope): Promise<void> {
    await this.withLocalFallback(
      () => this.api.delete(id, scope),
      () => this.localRepository.delete(id, scope),
    );
  }

  async reorder(input: ReorderEventsInput): Promise<void> {
    await this.withLocalFallback(
      () => this.api.reorder(input),
      () => this.localRepository.reorder(input),
    );
  }

  async transition(id: EventId, input: TransitionEventInput): Promise<Event> {
    return this.withLocalFallback(
      () => this.api.transition(id, input),
      () => this.localRepository.transition(id, input),
    );
  }
}
