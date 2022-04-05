import { gcalCalendarList } from "../../__mocks__/calendarlist/gcal.calendarlist";
import { MapCalendarList } from "../../mappers/map.calendarlist";

it("only supports primary calendar [for now]", () => {
  // update this once accepting multiple calendarlists
  const ccallist = MapCalendarList.toCompass(gcalCalendarList);
  expect(ccallist.google.items.length).toEqual(1);
  expect(ccallist.google.items[0].primary).toEqual(true);
});
