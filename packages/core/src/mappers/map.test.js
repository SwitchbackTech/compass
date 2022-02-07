import { Origin } from "../core.constants";
import { gcalEvents } from "../test-data/gcal/data.gcal.event";
import { gcalCalendarList } from "../test-data/gcal/data.gcal.calendarlist";
import { MapCalendarList } from "./map.calendarlist";
import { MapEvent } from "./map.event";

describe("CalendarList Mapper", () => {
  it("only supports primary calendar [for now]", () => {
    // update this once accepting multiple calendarlists
    const ccallist = MapCalendarList.toCompass(gcalCalendarList);
    expect(ccallist.google.items.length).toEqual(1);
    expect(ccallist.google.items[0].primary).toEqual(true);
  });
});

describe("toGcal", () => {
  const validGcalDates = [
    { start: "2022-01-01", end: "2022-01-02" },
    { start: "2022-01-01T07:07:00-05:00", end: "2022-01-01T12:27:23+10:00" },
  ];

  const validateGcalDateFormat = (gEvent) => {
    // ensures YYYY-MM-DD format
    const _usesDashesCorrectly = (dateStr) => {
      expect(dateStr[4]).toBe("-");
      expect(dateStr[7]).toBe("-");
    };
    const _isAllDay = "date" in gEvent.start && "date" in gEvent.end;

    if (_isAllDay) {
      _usesDashesCorrectly(gEvent.start.date);
      _usesDashesCorrectly(gEvent.end.date);
    } else {
      const yyyymmddStart = gEvent.start.dateTime.slice(0, 10);
      const yyyymmddEnd = gEvent.end.dateTime.slice(0, 10);
      _usesDashesCorrectly(yyyymmddStart);
      _usesDashesCorrectly(yyyymmddEnd);

      // confirms the expected offset/timezone indicator char is in the string
      // for example, these both match: 2022-01-01T03:00:00-5:00, 2022-01-01T03:00:00+10:00
      // the + or - is the 19th char in the str
      const _hasTzOffset = (dateStr) => ["-", "+"].includes(dateStr[19]);
      _hasTzOffset(gEvent.start.dateTime);
      _hasTzOffset(gEvent.end.dateTime);
    }
  };

  it("returns dates in expected format", () => {
    validGcalDates.forEach((dates) => {
      const gcalEvt = MapEvent.toGcal("someuser", {
        startDate: dates.start,
        endDate: dates.end,
      });
      validateGcalDateFormat(gcalEvt);
    });
  });
});

describe("toCompass", () => {
  it("uses an expected origin", () => {
    const eventsFromCompass = MapEvent.toCompass(
      "user1",
      gcalEvents.items,
      Origin.Compass
    );

    const eventsFromGcalImport = MapEvent.toCompass(
      "user1",
      gcalEvents.items,
      Origin.GoogleImport
    );

    const allEvents = [...eventsFromCompass, ...eventsFromGcalImport];
    allEvents.forEach((ce) => {
      expect(Object.values(Origin).includes(ce.origin)).toBe(true);
    });
  });
});
