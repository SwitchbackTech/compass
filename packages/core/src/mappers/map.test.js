import { MapCalendarList } from "./map.calendarlist";
import { gcalListDemo } from "./map.demo";

describe("CalendarList Mapper", () => {
  test("Only supports primary calendar", () => {
    // update this once accepting multiple calendarlists
    const ccallist = MapCalendarList.toCompass(gcalListDemo);
    expect(ccallist.google.items.length).toEqual(1);
    expect(ccallist.google.items[0].primary).toEqual(true);
  });
});
