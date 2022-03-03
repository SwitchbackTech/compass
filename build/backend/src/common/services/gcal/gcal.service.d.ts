import { gSchema$Event, gParamsEventsList, gCalendar } from "@core/types/gcal";
import { BaseError } from "@core/errors/errors.base";
declare class GCalService {
  createEvent(
    gcal: gCalendar,
    event: gSchema$Event
  ): Promise<import("googleapis").calendar_v3.Schema$Event>;
  deleteEvent(gcal: gCalendar, gcalEventId: string): Promise<void | BaseError>;
  getEvents(
    gcal: gCalendar,
    params: gParamsEventsList
  ): Promise<
    import("gaxios").GaxiosResponse<
      import("googleapis").calendar_v3.Schema$Events
    >
  >;
  listCalendars(
    gcal: gCalendar
  ): Promise<BaseError | import("googleapis").calendar_v3.Schema$CalendarList>;
  updateEvent(
    gcal: gCalendar,
    gEventId: string,
    event: gSchema$Event
  ): Promise<BaseError | import("googleapis").calendar_v3.Schema$Event>;
}
declare const _default: GCalService;
export default _default;
//# sourceMappingURL=gcal.service.d.ts.map
