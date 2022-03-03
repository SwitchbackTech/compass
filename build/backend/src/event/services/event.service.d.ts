import { InsertManyResult } from "mongodb";
import { Result_Import_Gcal } from "@core/types/sync.types";
import { BaseError } from "@core/errors/errors.base";
import {
  Schema_Event,
  Query_Event,
  Params_DeleteMany,
  Result_DeleteMany,
} from "@core/types/event.types";
import { gCalendar } from "@core/types/gcal";
declare class EventService {
  create(
    userId: string,
    event: Schema_Event
  ): Promise<Schema_Event | BaseError>;
  createMany(
    userId: string,
    data: Schema_Event[]
  ): Promise<InsertManyResult | BaseError>;
  deleteAllByUser(userId: string): Promise<import("mongodb").DeleteResult>;
  deleteById(
    userId: string,
    id: string
  ): Promise<BaseError | import("mongodb").DeleteResult>;
  deleteMany(
    userId: string,
    params: Params_DeleteMany
  ): Promise<Result_DeleteMany>;
  import(userId: string, gcal: gCalendar): Promise<Result_Import_Gcal>;
  readAll(
    userId: string,
    query: Query_Event
  ): Promise<Schema_Event[] | BaseError>;
  readById(userId: string, eventId: string): Promise<Schema_Event | BaseError>;
  updateById(
    userId: string,
    eventId: string,
    event: Schema_Event
  ): Promise<Schema_Event | BaseError>;
  updateMany(userId: string, events: Schema_Event[]): Promise<string>;
}
declare const _default: EventService;
export default _default;
//# sourceMappingURL=event.service.d.ts.map
