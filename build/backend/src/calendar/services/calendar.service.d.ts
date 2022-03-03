import { BaseError } from "@core/errors/errors.base";
import { Schema_CalendarList } from "@core/types/calendar.types";
declare class CalendarService {
  create(
    userId: string,
    calendarList: Schema_CalendarList
  ): Promise<
    BaseError | import("mongodb").InsertOneResult<import("bson").Document>
  >;
}
declare const _default: CalendarService;
export default _default;
//# sourceMappingURL=calendar.service.d.ts.map
