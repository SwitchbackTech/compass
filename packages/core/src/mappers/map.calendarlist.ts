import { Schema_CalendarList } from "@core/types/calendar.types";

import { gSchema$CalendarList } from "../../../backend/declarations";

const MapCalendarList = {
  toCompass(gcalList: gSchema$CalendarList): Schema_CalendarList {
    //TODO validate schema
    console.log("Reminder: Only using primary calendarlist");

    const primaryGcal = gcalList.items.filter((c) => {
      return c.primary === true;
    })[0];

    const mapped = {
      google: {
        nextSyncToken: gcalList.nextSyncToken,
        items: [primaryGcal],
      },
    };

    return mapped;
  },
};

export { MapCalendarList };
