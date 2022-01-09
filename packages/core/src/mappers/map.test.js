import { gcalListDemo, gcalItemsDemo } from "./map.demo";
import { MapCalendarList } from "./map.calendarlist";
import { MapEvent } from "./map.event";

describe("CalendarList Mapper", () => {
  test("Only supports primary calendar", () => {
    // update this once accepting multiple calendarlists
    const ccallist = MapCalendarList.toCompass(gcalListDemo);
    expect(ccallist.google.items.length).toEqual(1);
    expect(ccallist.google.items[0].primary).toEqual(true);
  });

  test("Supports date and dateTime values", () => {
    const cEvent = MapEvent.toCompass("user1", gcalItemsDemo);
  });
});
