import { Origin, Priorities } from "../../core.constants";
import { gcalEvents } from "../../__mocks__/events/gcal/gcal.event";
import { MapEvent } from "../map.event";

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
      const gcalEvt = MapEvent.toGcal({
        startDate: dates.start,
        endDate: dates.end,
      });
      validateGcalDateFormat(gcalEvt);
    });
  });

  it("saves priority as private extended properties", () => {
    const gcalEvent = MapEvent.toGcal({
      _id: "yupm",
      user: "user1",
      title: "Jan 1 2021",
      isAllDay: true,
      startDate: "2021-01-01",
      endDate: "2021-01-02",
      priority: Priorities.WORK,
    });
    expect(gcalEvent.extendedProperties.private.priority).toBe(Priorities.WORK);
  });
  it("set priority to unassigned as private extended properties when no none provided", () => {
    const gcalEvent = MapEvent.toGcal({
      // no priority here
      _id: "yupm",
      user: "user1",
      title: "Jan 1 2021",
      isAllDay: true,
      startDate: "2021-01-01",
      endDate: "2021-01-02",
    });
    expect(gcalEvent.extendedProperties.private.priority).toBe(
      Priorities.UNASSIGNED
    );
  });
  it("set origin to unsure as private extended properties when no none provided", () => {
    const gcalEvent = MapEvent.toGcal({
      // no origin here
      _id: "yupm",
      user: "user1",
      title: "Jan 1 2021",
      isAllDay: true,
      startDate: "2021-01-01",
      endDate: "2021-01-02",
    });
    expect(gcalEvent.extendedProperties.private.origin).toBe(Origin.UNSURE);
  });
});

describe("toCompass", () => {
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
  it("sets default priority to unassigned", () => {
    const gEvent = gcalEvents.items.find(
      (ge) => ge.summary === "No extendedProperties"
    );
    const cEvent = MapEvent.toCompass("user1", [gEvent], Origin.Compass);
    expect(cEvent[0].priority).toBe(Priorities.UNASSIGNED);
  });

  it("infers isAllDay when date is in YYYY-MM-DD format", () => {
    allEvents.forEach((e) => {
      if (e.startDate.length === "YYYY-MM-DD".length) {
        expect(e.isAllDay).toBe(true);
      }
    });
  });

  describe("from Gcal", () => {
    it("gets priority from private extended properties", () => {
      const regularGcalEvent = gcalEvents.items.find(
        (ge) => ge.summary === "Meeting with Stan"
      );
      const cEvent = MapEvent.toCompass(
        "user99",
        [regularGcalEvent],
        Origin.GoogleImport
      );

      expect(cEvent[0].priority).toBe("work");
    });

    it("skips cancelled events", () => {
      // future: run schema validation
      const i = gcalEvents.items;
      const events = MapEvent.toCompass("someId", i, Origin.Google);

      let hasCancelledEvent = false;
      events.forEach((e) => {
        if (e.status === "cancelled") {
          hasCancelledEvent = true;
          return;
        }
      });

      expect(hasCancelledEvent).toBe(false);
    });

    it("uses an expected origin", () => {
      allEvents.forEach((ce) => {
        expect(Object.values(Origin).includes(ce.origin)).toBe(true);
      });
    });
  });
});
