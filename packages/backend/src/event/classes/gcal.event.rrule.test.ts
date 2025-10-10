import { ObjectId } from "mongodb";
import { RRule } from "rrule";
import { faker } from "@faker-js/faker";
import { recurring } from "@core/__mocks__/v1/events/gcal/gcal.recurring";
import { GCAL_MAX_RECURRENCES } from "@core/constants/core.constants";
import { gSchema$EventBase } from "@core/types/gcal";
import dayjs from "@core/util/date/dayjs";
import { isInstance } from "@core/util/event/event.util";
import {
  isBaseGCalEvent,
  isInstanceGCalEvent,
  parseGCalEventDate,
} from "@core/util/event/gcal.event.util";
import {
  generateGcalEventDate,
  mockRecurringGcalBaseEvent,
} from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { GcalEventRRule } from "@backend/event/classes/gcal.event.rrule";

describe("GcalEventRRule: ", () => {
  it(`should return the correct number of events based on rrule count`, () => {
    const count = faker.number.int({ min: 1, max: GCAL_MAX_RECURRENCES });
    const rruleString = `RRULE:FREQ=DAILY;COUNT=${count}`;
    const baseEvent = mockRecurringGcalBaseEvent();

    const rrule = new GcalEventRRule({
      ...baseEvent,
      recurrence: [rruleString],
    });

    expect(rrule.toString()).toContain("RRULE:FREQ=DAILY");
    expect(rrule.toString()).toContain(`COUNT=${count}`);
    expect(rrule.count()).toBe(count);
    expect(rrule.all()).toHaveLength(count);
  });

  it(`should adjust the COUNT in the rrule string to a maximum of ${GCAL_MAX_RECURRENCES}`, () => {
    const rruleString = "RRULE:FREQ=DAILY;COUNT=1000";
    const baseEvent = mockRecurringGcalBaseEvent();

    const rrule = new GcalEventRRule({
      ...baseEvent,
      recurrence: [rruleString],
    });

    expect(rrule.toString()).toContain("RRULE:FREQ=DAILY");
    expect(rrule.count()).toBe(GCAL_MAX_RECURRENCES);
    expect(rrule.all()).toHaveLength(GCAL_MAX_RECURRENCES);
  });

  it("should return the rrule in system timezone", () => {
    const baseEvent = mockRecurringGcalBaseEvent();
    const rrule = new GcalEventRRule(baseEvent);
    const startDate = parseGCalEventDate(baseEvent.start);
    const events = rrule.all();

    expect(rrule.options.dtstart.toISOString()).toEqual(
      startDate.toISOString(),
    );

    expect(events).toEqual(expect.arrayContaining([startDate.toDate()]));
  });

  describe("diffOptions", () => {
    it("should return the differences between two rrule options", () => {
      const until = dayjs();
      const untilRule = `UNTIL=${until.toRRuleDTSTARTString()}`;
      const rule = [`RRULE:FREQ=DAILY;COUNT=10;BYDAY=MO,WE,FR;${untilRule}`];
      const baseEvent = { ...mockRecurringGcalBaseEvent(), recurrence: rule };
      const rrule = new GcalEventRRule(baseEvent);
      const untilFormat = dayjs.DateFormat.RFC5545;
      const nextUntil = dayjs(until.toRRuleDTSTARTString(), untilFormat);

      const rruleA = new GcalEventRRule(
        { ...baseEvent, recurrence: [] },
        {
          freq: RRule.DAILY, // DAILY
          count: 10,
          byweekday: [RRule.MO.weekday, RRule.WE.weekday, RRule.FR.weekday], // MO, WE, FR
          interval: 1,
          until: nextUntil.toDate(), // new until date
        },
      );

      const rruleB = new GcalEventRRule(
        { ...baseEvent, recurrence: [] },
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

  describe("toRecurrence", () => {
    it("should return the recurrence string as an array", () => {
      const baseEvent = mockRecurringGcalBaseEvent();
      const rrule = new GcalEventRRule(baseEvent);
      const recurrence = rrule.toRecurrence();

      expect(recurrence).toBeInstanceOf(Array);
      expect(recurrence.length).toBeGreaterThan(0);

      expect(recurrence.some((rule) => rule.startsWith("RRULE:"))).toEqual(
        true,
      );
    });
  });

  describe("instances", () => {
    it(`should return a maximum of ${GCAL_MAX_RECURRENCES} gcal instances if no count is supplied in the recurrence`, () => {
      const baseEvent = mockRecurringGcalBaseEvent();
      const recurrence = ["RRULE:FREQ=DAILY"];
      const rrule = new GcalEventRRule({ ...baseEvent, recurrence });
      const instances = rrule.instances();

      expect(instances).toBeInstanceOf(Array);
      expect(instances).toHaveLength(GCAL_MAX_RECURRENCES);
      expect(instances.every(isInstanceGCalEvent)).toEqual(true);
    });

    it(`should return a maximum of ${GCAL_MAX_RECURRENCES} gcal instances if count exceeds maximum gcal recurrence`, () => {
      const baseEvent = mockRecurringGcalBaseEvent();
      const recurrence = ["RRULE:FREQ=DAILY;COUNT=1000"];
      const rrule = new GcalEventRRule({ ...baseEvent, recurrence });
      const instances = rrule.instances();

      expect(instances).toBeInstanceOf(Array);
      expect(instances).toHaveLength(GCAL_MAX_RECURRENCES);
      expect(instances.every(isInstanceGCalEvent)).toEqual(true);
    });

    it("should return the correct number of gcal instances based on rrule count", () => {
      const baseEvent = mockRecurringGcalBaseEvent();
      const count = faker.number.int({ min: 1, max: GCAL_MAX_RECURRENCES });
      const recurrence = [`RRULE:FREQ=DAILY;COUNT=${count}`];
      const rrule = new GcalEventRRule({ ...baseEvent, recurrence });
      const instances = rrule.instances();

      expect(instances).toBeInstanceOf(Array);
      expect(instances).toHaveLength(count);
    });

    it("should return gcal instances with the correct date format and timezone for an ALLDAY base event", () => {
      const recurrence = ["RRULE:FREQ=DAILY;COUNT=10"];
      const startOfYear = dayjs().startOf("year"); // specific date for testing
      const dates = generateGcalEventDate({ date: startOfYear, allDay: true });
      const baseEvent = mockRecurringGcalBaseEvent(dates, true);
      const rrule = new GcalEventRRule({ ...baseEvent, recurrence });
      const instances = rrule.instances();
      const startDate = parseGCalEventDate(baseEvent.start);
      const endDate = parseGCalEventDate(baseEvent.end);
      const dateFormat = dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT;

      instances.forEach((instance, index) => {
        expect(instance.start).toBeDefined();
        expect(instance.end).toBeDefined();
        expect(instance.start?.date).toBeDefined();
        expect(instance.end?.date).toBeDefined();
        expect(instance.start?.timeZone).toBeDefined();
        expect(instance.end?.timeZone).toBeDefined();

        expect(instance.start?.timeZone).toEqual(baseEvent.start?.timeZone);
        expect(instance.end?.timeZone).toEqual(baseEvent.start?.timeZone);

        expect(instance.start?.date).toEqual(
          startDate.add(index, "day").format(dateFormat),
        );

        expect(instance.end?.date).toEqual(
          endDate.add(index, "day").format(dateFormat),
        );
      });
    });

    it("should return gcal instances with the correct date format and timezone for a TIMED base event", () => {
      const recurrence = ["RRULE:FREQ=DAILY;COUNT=10"];
      const startOfYear = dayjs().startOf("year"); // specific date for testing
      const dates = generateGcalEventDate({ date: startOfYear });
      const baseEvent = mockRecurringGcalBaseEvent(dates);
      const rrule = new GcalEventRRule({ ...baseEvent, recurrence });
      const instances = rrule.instances();
      const startDate = parseGCalEventDate(baseEvent.start);
      const endDate = parseGCalEventDate(baseEvent.end);
      const dateFormat = dayjs.DateFormat.RFC3339_OFFSET;

      instances.forEach((instance, index) => {
        expect(instance.start).toBeDefined();
        expect(instance.end).toBeDefined();
        expect(instance.start?.dateTime).toBeDefined();
        expect(instance.end?.dateTime).toBeDefined();
        expect(instance.start?.timeZone).toBeDefined();
        expect(instance.end?.timeZone).toBeDefined();

        expect(instance.start?.timeZone).toEqual(baseEvent.start?.timeZone);
        expect(instance.end?.timeZone).toEqual(baseEvent.start?.timeZone);

        expect(instance.start?.dateTime).toEqual(
          startDate.add(index, "day").format(dateFormat),
        );

        expect(instance.end?.dateTime).toEqual(
          endDate.add(index, "day").format(dateFormat),
        );
      });
    });

    it("should have times and timezones that match a real gcal event", () => {
      const baseEvent = recurring.find(isBaseGCalEvent) as gSchema$EventBase;

      expect(baseEvent).toBeDefined();
      expect(baseEvent).not.toBeNull();

      const rrule = new GcalEventRRule(baseEvent);
      const gcalInstances = recurring.filter(isInstanceGCalEvent);
      const instances = rrule.instances();

      instances.forEach((instance, index) => {
        const gcalInstance = gcalInstances[index];

        expect(gcalInstance).toBeDefined();
        expect(gcalInstance).not.toBeNull();

        expect(instance.start?.dateTime).toBeDefined();
        expect(instance.start?.dateTime).not.toBeNull();
        expect(instance.end?.dateTime).toBeDefined();
        expect(instance.end?.dateTime).not.toBeNull();
        expect(instance.start?.timeZone).toBeDefined();
        expect(instance.start?.timeZone).not.toBeNull();
        expect(instance.end?.timeZone).toBeDefined();
        expect(instance.end?.timeZone).not.toBeNull();

        expect(instance.start?.timeZone).toEqual(baseEvent.start?.timeZone);
        expect(instance.end?.timeZone).toEqual(baseEvent.start?.timeZone);
        expect(instance.start?.timeZone).toEqual(gcalInstance?.start?.timeZone);
        expect(instance.end?.timeZone).toEqual(gcalInstance?.start?.timeZone);

        expect(instance.start?.dateTime).toEqual(gcalInstance?.start?.dateTime);
        expect(instance.end?.dateTime).toEqual(gcalInstance?.end?.dateTime);
      });
    });
  });

  describe("compassInstances", () => {
    it("should return compass events based on the rrule instances for a TIMED base event", () => {
      const recurrence = ["RRULE:FREQ=DAILY;COUNT=10"];
      const startOfYear = dayjs().startOf("year"); // specific date for testing
      const dates = generateGcalEventDate({ date: startOfYear });
      const userId = faker.string.uuid();
      const baseEvent = mockRecurringGcalBaseEvent(dates);
      const baseCompassId = new ObjectId();
      const rrule = new GcalEventRRule({ ...baseEvent, recurrence });
      const instances = rrule.compassInstances(userId, baseCompassId);
      const startDate = parseGCalEventDate(baseEvent.start);
      const endDate = parseGCalEventDate(baseEvent.end);
      const dateFormat = dayjs.DateFormat.RFC3339_OFFSET;

      expect(instances).toBeInstanceOf(Array);
      expect(instances.length).toBeGreaterThan(0);

      instances.forEach((instance, index) => {
        expect(instance.user).toEqual(userId);
        expect(instance.startDate).toBeDefined();
        expect(instance.endDate).toBeDefined();
        expect(isInstance(instance)).toEqual(true);

        expect(instance.startDate).toEqual(
          startDate.add(index, "day").format(dateFormat),
        );

        expect(instance.endDate).toEqual(
          endDate.add(index, "day").format(dateFormat),
        );
      });
    });

    it("should return compass events based on the rrule instances for an ALLDAY base event", () => {
      const userId = faker.string.uuid();
      const recurrence = ["RRULE:FREQ=DAILY;COUNT=10"];
      const startOfYear = dayjs().startOf("year"); // specific date for testing
      const dates = generateGcalEventDate({ date: startOfYear, allDay: true });
      const baseEvent = mockRecurringGcalBaseEvent(dates, true);
      const rrule = new GcalEventRRule({ ...baseEvent, recurrence });
      const baseCompassId = new ObjectId();
      const instances = rrule.compassInstances(userId, baseCompassId);
      const startDate = parseGCalEventDate(baseEvent.start);
      const endDate = parseGCalEventDate(baseEvent.end);
      const dateFormat = dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT;

      expect(instances).toBeInstanceOf(Array);
      expect(instances.length).toBeGreaterThan(0);

      instances.forEach((instance, index) => {
        expect(instance.user).toEqual(userId);
        expect(instance.startDate).toBeDefined();
        expect(instance.endDate).toBeDefined();
        expect(isInstance(instance)).toEqual(true);

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
