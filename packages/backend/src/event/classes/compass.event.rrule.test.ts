import { ObjectId } from "mongodb";
import { faker } from "@faker-js/faker";
import { GCAL_MAX_RECURRENCES } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import { parseCompassEventDate } from "@core/util/event/event.util";
import {
  createMockBaseEvent,
  generateCompassEventDates,
} from "@core/util/test/ccal.event.factory";
import { CompassEventRRule } from "@backend/event/classes/compass.event.rrule";

describe("CompassEventRRule: ", () => {
  it(`should return the correct number of events based on rrule count`, () => {
    const count = faker.number.int({ min: 1, max: GCAL_MAX_RECURRENCES });
    const rruleString = `RRULE:FREQ=DAILY;COUNT=${count}`;

    const baseEvent = createMockBaseEvent({
      recurrence: { rule: [rruleString] },
    });

    const rrule = new CompassEventRRule({
      ...baseEvent,
      _id: new ObjectId(baseEvent._id),
    });

    expect(rrule.toString()).toContain("RRULE:FREQ=DAILY");
    expect(rrule.toString()).toContain(`COUNT=${count}`);
    expect(rrule.count()).toBe(count);
    expect(rrule.all()).toHaveLength(count);
  });

  it(`should adjust the COUNT in the rrule string to a maximum of ${GCAL_MAX_RECURRENCES}`, () => {
    const rruleString = "RRULE:FREQ=DAILY;COUNT=1000";

    const baseEvent = createMockBaseEvent({
      recurrence: { rule: [rruleString] },
    });

    const rrule = new CompassEventRRule({
      ...baseEvent,
      _id: new ObjectId(baseEvent._id),
    });

    expect(rrule.toString()).toContain("RRULE:FREQ=DAILY");
    expect(rrule.toString()).toContain(`COUNT=${GCAL_MAX_RECURRENCES}`);
    expect(rrule.count()).toBe(GCAL_MAX_RECURRENCES);
    expect(rrule.all()).toHaveLength(GCAL_MAX_RECURRENCES);
  });

  it("should return the rrule in system timezone", () => {
    const baseEvent = createMockBaseEvent();
    const rrule = new CompassEventRRule({
      ...baseEvent,
      _id: new ObjectId(baseEvent._id),
    });
    const startDate = parseCompassEventDate(baseEvent.startDate!);
    const events = rrule.all();

    expect(rrule.options.dtstart.toISOString()).toEqual(
      startDate.toISOString(),
    );

    expect(events).toEqual(expect.arrayContaining([startDate.toDate()]));
  });

  it("should return the rrule without DTSTART and DTEND", () => {
    const baseEvent = createMockBaseEvent();
    const rrule = new CompassEventRRule({
      ...baseEvent,
      _id: new ObjectId(baseEvent._id),
    });

    expect(rrule.toString().includes("DTSTART")).toEqual(false);
    expect(rrule.toString().includes("DTEND")).toEqual(false);

    expect(
      rrule.toRecurrence().some((rule) => rule.includes("DTSTART")),
    ).toEqual(false);

    expect(rrule.toRecurrence().some((rule) => rule.includes("DTEND"))).toEqual(
      false,
    );
  });

  describe("base", () => {
    it("should return the recurrence string as an array", () => {
      const baseEvent = createMockBaseEvent();
      const rrule = new CompassEventRRule({
        ...baseEvent,
        _id: new ObjectId(baseEvent._id),
      });
      const recurrence = rrule.toRecurrence();

      expect(recurrence).toBeInstanceOf(Array);
      expect(recurrence.length).toBeGreaterThan(0);

      expect(recurrence.some((rule) => rule.startsWith("RRULE:"))).toEqual(
        true,
      );
    });
  });

  describe("instances", () => {
    it(`should return a maximum of ${GCAL_MAX_RECURRENCES} compass instances if no count is supplied in the recurrence`, () => {
      const rule = ["RRULE:FREQ=DAILY"];
      const baseEvent = createMockBaseEvent({ recurrence: { rule } });
      const rrule = new CompassEventRRule({
        ...baseEvent,
        _id: new ObjectId(baseEvent._id),
      });
      const instances = rrule.instances();

      expect(instances).toBeInstanceOf(Array);
      expect(instances).toHaveLength(GCAL_MAX_RECURRENCES);
    });

    it(`should return a maximum of ${GCAL_MAX_RECURRENCES} compass instances if count exceeds maximum recurrence`, () => {
      const rule = ["RRULE:FREQ=DAILY;COUNT=1000"];
      const baseEvent = createMockBaseEvent({ recurrence: { rule } });
      const rrule = new CompassEventRRule({
        ...baseEvent,
        _id: new ObjectId(baseEvent._id),
      });
      const instances = rrule.instances();

      expect(instances).toBeInstanceOf(Array);
      expect(instances).toHaveLength(GCAL_MAX_RECURRENCES);
    });

    it("should return the correct number of compass instances based on rrule count", () => {
      const count = faker.number.int({ min: 1, max: GCAL_MAX_RECURRENCES });
      const rule = [`RRULE:FREQ=DAILY;COUNT=${count}`];
      const baseEvent = createMockBaseEvent({ recurrence: { rule } });
      const rrule = new CompassEventRRule({
        ...baseEvent,
        _id: new ObjectId(baseEvent._id),
      });
      const instances = rrule.instances();

      expect(instances).toBeInstanceOf(Array);
      expect(instances).toHaveLength(count);
    });

    it("should return compass instances with the correct date format and timezone for an ALLDAY base event", () => {
      const rule = ["RRULE:FREQ=DAILY;COUNT=10"];
      const date = dayjs().startOf("year"); // specific date for testing
      const dates = generateCompassEventDates({ date, allDay: true });
      const baseEvent = createMockBaseEvent({ ...dates, recurrence: { rule } });
      const rrule = new CompassEventRRule({
        ...baseEvent,
        _id: new ObjectId(baseEvent._id),
      });
      const instances = rrule.instances();
      const startDate = parseCompassEventDate(baseEvent.startDate!);
      const endDate = parseCompassEventDate(baseEvent.endDate!);
      const dateFormat = dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT;

      instances.forEach((instance, index) => {
        expect(instance.startDate).toBeDefined();
        expect(instance.endDate).toBeDefined();

        expect(instance.startDate).toEqual(
          startDate.add(index, "day").format(dateFormat),
        );

        expect(instance.endDate).toEqual(
          endDate.add(index, "day").format(dateFormat),
        );
      });
    });

    it("should return compass instances with the correct date format and timezone for a TIMED base event", () => {
      const rule = ["RRULE:FREQ=DAILY;COUNT=10"];
      const date = dayjs().startOf("year"); // specific date for testing
      const dates = generateCompassEventDates({ date });
      const baseEvent = createMockBaseEvent({ ...dates, recurrence: { rule } });
      const rrule = new CompassEventRRule({
        ...baseEvent,
        _id: new ObjectId(baseEvent._id),
      });
      const instances = rrule.instances();
      const startDate = parseCompassEventDate(baseEvent.startDate!);
      const endDate = parseCompassEventDate(baseEvent.endDate!);
      const dateFormat = dayjs.DateFormat.RFC3339_OFFSET;

      instances.forEach((instance, index) => {
        expect(instance.startDate).toBeDefined();
        expect(instance.endDate).toBeDefined();

        expect(instance.startDate).toEqual(
          startDate.add(index, "day").format(dateFormat),
        );

        expect(instance.endDate).toEqual(
          endDate.add(index, "day").format(dateFormat),
        );
      });
    });
  });
});
