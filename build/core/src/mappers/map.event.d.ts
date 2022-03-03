import { Origin } from "@core/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
export declare namespace MapEvent {
  const toCompass: (
    userId: string,
    events: gSchema$Event[],
    origin: Origin
  ) => Schema_Event[];
  const toGcal: (event: Schema_Event) => gSchema$Event;
}
//# sourceMappingURL=map.event.d.ts.map
