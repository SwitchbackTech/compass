import { gSchema$CalendarList } from "@core/types/gcal";

const MapCalendarList = {
  toCompass(gcalList: gSchema$CalendarList) {
    return {
      google: {
        items: [gcalList],
      },
    };
  },
};

export { MapCalendarList };
