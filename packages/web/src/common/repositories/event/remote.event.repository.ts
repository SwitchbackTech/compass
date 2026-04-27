import {
  type Params_Events,
  type Payload_Order,
  type RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import {
  isBackendUnavailableError,
  markBackendUnavailable,
} from "@web/common/apis/util/backend-unavailable-error.util";
import { EventApi } from "@web/ducks/events/event.api";
import { type Response_GetEventsSuccess } from "@web/ducks/events/event.types";
import { type EventRepository } from "./event.repository.interface";
import { LocalEventRepository } from "./local.event.repository";

export class RemoteEventRepository implements EventRepository {
  private readonly localRepository = new LocalEventRepository();

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

  async create(event: Schema_Event | Schema_Event[]): Promise<void> {
    await this.withLocalFallback(
      () => EventApi.create(event),
      () => this.localRepository.create(event),
    );
  }

  async get(params: Params_Events): Promise<Response_GetEventsSuccess> {
    return this.withLocalFallback(
      async () => {
        const response = await EventApi.get(params);

        return Array.isArray(response.data)
          ? {
              data: response.data,
              count: response.data.length,
              page: 1,
              pageSize: response.data.length,
              offset: 0,
              startDate: params.startDate,
              endDate: params.endDate,
            }
          : {
              ...params,
              ...response.data,
            };
      },
      () => this.localRepository.get(params),
    );
  }

  async edit(
    _id: string,
    event: Schema_Event,
    params: { applyTo?: RecurringEventUpdateScope },
  ): Promise<void> {
    await this.withLocalFallback(
      () => EventApi.edit(_id, event, params),
      () => this.localRepository.edit(_id, event, params),
    );
  }

  async delete(
    _id: string,
    applyTo?: RecurringEventUpdateScope,
  ): Promise<void> {
    await this.withLocalFallback(
      () => EventApi.delete(_id, applyTo),
      () => this.localRepository.delete(_id, applyTo),
    );
  }

  async reorder(order: Payload_Order[]): Promise<void> {
    await this.withLocalFallback(
      () => EventApi.reorder(order),
      () => this.localRepository.reorder(order),
    );
  }
}
