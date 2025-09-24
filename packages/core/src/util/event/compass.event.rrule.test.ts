import { ObjectId, type WithId } from "mongodb";
import { RRule } from "rrule";
import { faker } from "@faker-js/faker";
import { recurring } from "@core/__mocks__/v1/events/gcal/gcal.recurring";
import { GCAL_MAX_RECURRENCES, Origin } from "@core/constants/core.constants";
import { gEventToCompassEvent } from "@core/mappers/map.event";
import {
  CalendarProvider,
  type Schema_Event_Recur_Base,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { CompassEventRRule } from "@core/util/event/compass.event.rrule";
import {
  isBase,
  isInstance,
  parseCompassEventDate,
} from "@core/util/event/event.util";
import { isInstanceGCalEvent } from "@core/util/event/gcal.event.util";
import {
  createMockBaseEvent,
  generateCompassEventDates,
} from "@core/util/test/ccal.event.factory";

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

  it(`should adjust the instance COUNT to a maximum of ${GCAL_MAX_RECURRENCES}`, () => {
    const rruleString = "RRULE:FREQ=DAILY;COUNT=1000";

    const baseEvent = createMockBaseEvent({
      recurrence: { rule: [rruleString] },
    });

    const rrule = new CompassEventRRule({
      ...baseEvent,
      _id: new ObjectId(baseEvent._id),
    });

    expect(rrule.toString()).toContain("RRULE:FREQ=DAILY");
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

  describe("diffOptions", () => {
    it("should return the differences between two rrule options", () => {
      const until = dayjs();
      const untilRule = `UNTIL=${until.toRRuleDTSTARTString()}`;
      const rule = [`RRULE:FREQ=DAILY;COUNT=10;BYDAY=MO,WE,FR;${untilRule}`];
      const _baseEvent = createMockBaseEvent({ recurrence: { rule } });
      const _id = new ObjectId(_baseEvent._id);
      const baseEvent = { ..._baseEvent, _id };
      const rrule = new CompassEventRRule({ ...baseEvent, _id });
      const untilFormat = dayjs.DateFormat.RFC5545;
      const nextUntil = dayjs(until.toRRuleDTSTARTString(), untilFormat);

      const rruleA = new CompassEventRRule(
        { ...baseEvent, recurrence: { rule: [] } },
        {
          freq: RRule.DAILY, // DAILY
          count: 10,
          byweekday: [RRule.MO.weekday, RRule.WE.weekday, RRule.FR.weekday], // MO, WE, FR
          interval: 1,
          until: nextUntil.toDate(), // new until date
        },
      );

      const rruleB = new CompassEventRRule(
        { ...baseEvent, recurrence: { rule: [] } },
        {
          freq: RRule.DAILY, // DAILY
          count: 10,
          byweekday: [RRule.MO.weekday, RRule.WE.weekday, RRule.FR.weekday], // MO, WE, FR
          interval: 2,
          until: nextUntil.add(10, "minutes").toDate(), // new until date
        },
      );

      const diffsA = rrule.diffOptions(rruleA);
      const diffsB = rrule.diffOptions(rruleB);

      expect(diffsA).toBeInstanceOf(Array);
      expect(diffsA).toHaveLength(0);

      expect(diffsB).toBeInstanceOf(Array);
      expect(diffsB).toHaveLength(2);

      expect(diffsB).toEqual(
        expect.arrayContaining([
          ["interval", 2],
          ["until", expect.any(Date)],
        ]),
      );
    });
  });

  describe("toString", () => {
    it("should return the rrule string without DTSTART and DTEND", () => {
      const baseEvent = createMockBaseEvent();
      const _id = new ObjectId(baseEvent._id);
      const rrule = new CompassEventRRule({ ...baseEvent, _id });
      const rruleString = rrule.toString();

      expect(rruleString).toBeDefined();
      expect(rruleString).toContain("RRULE:");
      expect(rruleString.includes("DTSTART")).toEqual(false);
      expect(rruleString.includes("DTEND")).toEqual(false);
    });

    it("should append 'Z' to UNTIL date if not present", () => {
      const until = dayjs().startOf("day").toRRuleDTSTARTString();
      const rule = [`RRULE:FREQ=DAILY;COUNT=10;UNTIL=${until}`];
      const baseEvent = createMockBaseEvent({ recurrence: { rule } });
      const _id = new ObjectId(baseEvent._id);
      const rrule = new CompassEventRRule({ ...baseEvent, _id });
      const rruleString = rrule.toString();
      const rruleOriginalString = rrule.toOriginalString();

      expect(rruleOriginalString).toBeDefined();
      expect(rruleOriginalString).toContain("RRULE:");
      expect(rruleOriginalString).not.toContain(`UNTIL=${until}`);

      expect(rruleString).toBeDefined();
      expect(rruleString).toContain("RRULE:");
      expect(rruleString).toContain(`UNTIL=${until}`);
    });

    it("should return the rrule string without COUNT if count is Max Count", () => {
      const rule = [
        `RRULE:FREQ=DAILY;COUNT=${GCAL_MAX_RECURRENCES};INTERVAL=2`,
      ];

      const baseEvent = createMockBaseEvent({ recurrence: { rule } });
      const _id = new ObjectId(baseEvent._id);
      const rrule = new CompassEventRRule({ ...baseEvent, _id });
      const rruleString = rrule.toString();

      expect(rruleString).toBeDefined();
      expect(rruleString).toContain("RRULE:");
      expect(rruleString.includes("DTSTART")).toEqual(false);
      expect(rruleString.includes("DTEND")).toEqual(false);
    });
  });

  describe("toRecurrence", () => {
    it("should return the recurrence string as an array", () => {
      const baseEvent = createMockBaseEvent();
      const _id = new ObjectId(baseEvent._id);
      const rrule = new CompassEventRRule({ ...baseEvent, _id });
      const recurrence = rrule.toRecurrence();

      expect(recurrence).toBeInstanceOf(Array);
      expect(recurrence.length).toBeGreaterThan(0);

      expect(recurrence.some((rule) => rule.startsWith("RRULE:"))).toEqual(
        true,
      );
    });
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

    it("should include the specified provider data in the generated base event", () => {
      const baseEvent = createMockBaseEvent();

      const rrule = new CompassEventRRule({
        ...baseEvent,
        _id: new ObjectId(baseEvent._id),
      });

      const base = rrule.base();

      expect(base.gEventId).not.toBeDefined();
      expect(base.gEventId).not.toBeNull();

      const providerBase = rrule.base(CalendarProvider.GOOGLE);

      expect(providerBase.gEventId).toEqual(baseEvent._id.toString());
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

    it("should include the specified provider data in the generated instance events", () => {
      const rule = ["RRULE:FREQ=DAILY;COUNT=2"];
      const date = dayjs().startOf("year"); // specific date for testing
      const dates = generateCompassEventDates({ date });
      const baseEvent = createMockBaseEvent({ ...dates, recurrence: { rule } });

      const rrule = new CompassEventRRule({
        ...baseEvent,
        _id: new ObjectId(baseEvent._id),
      });

      const instances = rrule.instances();
      const providerInstances = rrule.instances(CalendarProvider.GOOGLE);

      instances.forEach((instance) => {
        expect(instance._id).toBeDefined();
        expect(instance.gEventId).not.toBeDefined();
        expect(instance.gEventId).not.toBeNull();
        expect(instance.gRecurringEventId).not.toBeDefined();
        expect(instance.gRecurringEventId).not.toBeNull();
      });

      providerInstances.forEach((instance) => {
        expect(instance._id).toBeDefined();
        expect(instance.gEventId).toBeDefined();
        expect(instance.gRecurringEventId).toBeDefined();
      });
    });

    it("should have times and timezones that match a real gcal event", () => {
      const baseCompassId = new ObjectId();

      const compassEvents = recurring.map((gEvent) => {
        const isInstance = isInstanceGCalEvent(gEvent);
        const _id = isInstance ? new ObjectId() : baseCompassId;

        const event = {
          ...gEventToCompassEvent(gEvent, "test-user", Origin.GOOGLE_IMPORT),
          _id,
        };

        if (isInstance) {
          event.recurrence = { eventId: baseCompassId.toString() };
        }

        return event;
      });

      const baseEvent = compassEvents.find(isBase) as WithId<
        Omit<Schema_Event_Recur_Base, "_id">
      >;

      expect(baseEvent).toBeDefined();
      expect(baseEvent).not.toBeNull();

      const rrule = new CompassEventRRule(baseEvent);
      const compassInstances = compassEvents.filter(isInstance);
      const instances = rrule.instances(CalendarProvider.GOOGLE);

      instances.forEach((instance, index) => {
        const compassInstance = compassInstances[index];

        expect(compassInstance).toBeDefined();
        expect(compassInstance).not.toBeNull();

        expect(instance.startDate).toBeDefined();
        expect(instance.startDate).not.toBeNull();
        expect(instance.endDate).toBeDefined();
        expect(instance.endDate).not.toBeNull();

        const startDate = parseCompassEventDate(instance.startDate!);
        const endDate = parseCompassEventDate(instance.endDate!);
        const cStartDate = parseCompassEventDate(compassInstance!.startDate!);
        const cEndDate = parseCompassEventDate(compassInstance!.endDate!);

        expect(startDate.isSame(cStartDate)).toBe(true);
        expect(endDate.isSame(cEndDate)).toBe(true);
      });
    });
  });
});
