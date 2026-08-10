import { type EventId } from "@core/types/domain-primitives";
import { type Event } from "@core/types/event.contracts";
import {
  type CreateEventInput,
  type EventListQuery,
  type RecurrenceScope,
  type ReplaceEventInput,
} from "@core/types/event-command.contracts";
import { decodeOccurrenceId } from "@core/util/occurrence-id";
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

  async create(input: CreateEventInput): Promise<Event> {
    return this.withLocalFallback(
      () => this.api.create(input),
      () => this.localRepository.create(input),
    );
  }

  async replace(id: EventId, input: ReplaceEventInput): Promise<Event> {
    try {
      return await this.api.replace(id, input);
    } catch (error) {
      if (!isBackendUnavailableError(error)) {
        throw error;
      }

      markBackendUnavailable();
      // Signed-in mutationFn may already have rebased scope-"all" onto the
      // series master. Local replaceSeries applies that delta again, so
      // falling through would corrupt DTSTART. Prefer failing closed: the
      // cloud series is the source of truth for this path.
      if (input.scope === "all" && decodeOccurrenceId(String(id))) {
        throw error;
      }

      return this.localRepository.replace(id, input);
    }
  }

  async delete(id: EventId, scope: RecurrenceScope): Promise<void> {
    await this.withLocalFallback(
      () => this.api.delete(id, scope),
      () => this.localRepository.delete(id, scope),
    );
  }
}
