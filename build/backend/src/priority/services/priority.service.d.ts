import { Schema_Priority, PriorityReq } from "@core/types/priority.types";
import { BaseError } from "@core/errors/errors.base";
declare class PriorityService {
  list(
    userId: string
  ): Promise<import("mongodb").WithId<import("bson").Document>[]>;
  readById(userId: string, id: string): Promise<Schema_Priority | object>;
  create(
    userId: string,
    data: PriorityReq | PriorityReq[]
  ): Promise<Schema_Priority | Schema_Priority[] | BaseError>;
  updateById(
    id: string,
    priority: PriorityReq
  ): Promise<Schema_Priority | BaseError>;
  deleteById(id: string): Promise<import("mongodb").DeleteResult>;
}
declare const _default: PriorityService;
export default _default;
//# sourceMappingURL=priority.service.d.ts.map
