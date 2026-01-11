import {
  Params_Events,
  Payload_Order,
  RecurringEventUpdateScope,
  Schema_Event,
} from "@core/types/event.types";
import { EventApi } from "@web/ducks/events/event.api";
import { Response_GetEventsSuccess } from "@web/ducks/events/event.types";
import { EventRepository } from "./event.repository.interface";

export class RemoteEventRepository implements EventRepository {
  async create(event: Schema_Event | Schema_Event[]): Promise<void> {
    await EventApi.create(event);
  }

  async get(params: Params_Events): Promise<Response_GetEventsSuccess> {
    console.log("[RemoteEventRepository] Fetching events with params:", {
      ...params,
      paramsKeys: Object.keys(params),
      hasDataInParams: "data" in params,
    });

    try {
      const response = await EventApi.get(params);

      console.log("[RemoteEventRepository] API response:", {
        status: response.status,
        hasData: !!response.data,
        responseDataType: Array.isArray(response.data)
          ? "array"
          : typeof response.data,
        responseDataKeys:
          typeof response.data === "object" && response.data !== null
            ? Object.keys(response.data)
            : [],
        hasDataField: response.data && "data" in response.data,
        responseData: response.data,
      });

      // Axios responses have a .data property, and the backend returns
      // the data in the shape of Response_HttpPaginatedSuccess<Schema_Event[]>
      // We combine it with params to create Response_GetEventsSuccess

      // Handle case where API returns array directly vs wrapped in pagination object
      const result: Response_GetEventsSuccess = Array.isArray(response.data)
        ? {
            // API returned array directly - wrap it in pagination format
            data: response.data,
            count: response.data.length,
            page: 1,
            pageSize: response.data.length,
            offset: 0,
            startDate: params.startDate,
            endDate: params.endDate,
          }
        : {
            // API returned pagination object - merge with params
            ...params,
            ...response.data,
          };

      console.log("[RemoteEventRepository] Returning result:", {
        hasDataField: "data" in result,
        dataLength: result.data?.length,
        count: result.count,
        resultKeys: Object.keys(result),
        result: result,
      });

      return result;
    } catch (error) {
      console.error("[RemoteEventRepository] Failed to fetch events:", error);
      throw error;
    }
  }

  async edit(
    _id: string,
    event: Schema_Event,
    params: { applyTo?: RecurringEventUpdateScope },
  ): Promise<void> {
    await EventApi.edit(_id, event, params);
  }

  async delete(
    _id: string,
    applyTo?: RecurringEventUpdateScope,
  ): Promise<void> {
    await EventApi.delete(_id, applyTo);
  }

  async reorder(order: Payload_Order[]): Promise<void> {
    await EventApi.reorder(order);
  }
}
