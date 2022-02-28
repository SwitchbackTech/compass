import { gSchema$CalendarList } from "@core/types/gcal";
import { Schema_CalendarList } from "@core/types/calendar.types";

const MapCalendarList = {
  toCompass(gcalList: gSchema$CalendarList): Schema_CalendarList {
    const primaryGcal = gcalList.items?.filter((c) => {
      return c.primary === true;
    })[0];

    const mapped = {
      google: {
        nextSyncToken: gcalList.nextSyncToken || "error",
        items: [primaryGcal],
      },
    };

    // @ts-ignore
    return mapped;
  },
};

export { MapCalendarList };
