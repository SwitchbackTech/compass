import { MapCalendarList } from "./map.calendarlist";
import { gcalListDemo } from "./map.demo";

describe("Mappers", () => {
  test("CalendarList mapper", () => {
    const compassCalList = MapCalendarList.toCompass(gcalListDemo);
    // const compassCalList = MapCalendarList.toCompass([]);
    const f = 1;
  });
});
