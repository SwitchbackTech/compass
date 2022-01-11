import { calendarList, events } from "./test.data.gcal/demo.calendarlist";
import { MapCalendarList } from "./map.calendarlist";
import { MapEvent } from "./map.event";

describe("CalendarList Mapper", () => {
  test("Only supports primary calendar", () => {
    // update this once accepting multiple calendarlists
    const ccallist = MapCalendarList.toCompass(calendarList);
    expect(ccallist.google.items.length).toEqual(1);
    expect(ccallist.google.items[0].primary).toEqual(true);
  });
});

describe("Event Mapper", () => {
  const validDates = ["2022-01-01 10:00", "2022-01-01 10:00:00"];

  // the map functionality will need to improve once supporting timezones for recurring events and other use-cases
  // so, these are kept here to make updating the tests for those cases easier
  // const _futureLegitStartDate = "2022-01-01T03:00:00-5:00";
  // const _futureValidDates = ["2022-01-01T05:00:00-5:00", "2022-01-09T00:00:00Z"];

  const isValidGcalDateFormat = (dateStr) => {
    const isRFC3339 = new Date(dateStr).toISOString();

    // compass doesn't support timezone offsets currently,
    // so make sure we're not passing them around by checking for a slash at the end.
    // for example, these both match: 2022-01-01T03:00:00-5:00, 2022-01-01T03:00:00-10:00
    const noTzOffset =
      dateStr.slice(-6, -5) !== "-" && dateStr.slice(-5, -4) !== "-";

    return isRFC3339 && noTzOffset;
  };

  test("toGcal: returns dates in expected format", () => {
    validDates.forEach((dateStr) => {
      const gcalEvt = MapEvent.toGcal("someuser", {
        startDate: dateStr,
        endDate: dateStr,
      });

      const bothTimesValid =
        isValidGcalDateFormat(gcalEvt.start.dateTime) &&
        isValidGcalDateFormat(gcalEvt.end.dateTime);
      expect(bothTimesValid).toBe(true);
    });
  });
});
