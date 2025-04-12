import { gcalCalendarList } from "../__mocks__/calendarlist/gcal.calendarlist";
import { MapCalendarList } from "./map.calendarlist";

it("supports multiple calendars", () => {
  const ccallist = MapCalendarList.toCompass(gcalCalendarList);
  expect(ccallist.google.items).toHaveLength(1);
  expect(ccallist.google.items[0].items.length).toBeGreaterThan(1);
});
