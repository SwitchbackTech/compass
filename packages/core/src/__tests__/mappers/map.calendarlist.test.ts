import { gcalCalendarList } from "../../__mocks__/calendarlist/gcal.calendarlist";
import { MapCalendarList } from "../../mappers/map.calendarlist";

it("supports multiple calendars", () => {
  const ccallist = MapCalendarList.toCompass(gcalCalendarList);
  expect(ccallist.google.items.length).toEqual(1);
  expect(ccallist.google.items[0].items.length).toBeGreaterThan(1);
});
