import { ObjectId } from "bson";
import { RRule } from "rrule";
import { faker } from "@faker-js/faker";
import { recurring } from "@core/__mocks__/v1/events/gcal/gcal.recurring";
import { GCAL_MAX_RECURRENCES, Origin } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import { CompassEventRRule } from "@core/util/event/compass.event.rrule";
import { isBase, isInstance } from "@core/util/event/event.util";
import { isInstanceGCalEvent } from "@core/util/event/gcal.event.util";
import {
  createMockBaseEvent,
  generateCompassEventDates,
} from "@core/util/test/ccal.event.factory";
import { MapGCalEvent } from "../../mappers/map.gcal.event";
import { BaseEventSchema, RecurrenceRuleSchema } from "../../types/event.types";

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

  it("should return the rrule in system timezone", () => {
    const baseEvent = createMockBaseEvent();
    const rrule = new CompassEventRRule({
      ...baseEvent,
      _id: new ObjectId(baseEvent._id),
    });
    const startDate = dayjs(baseEvent.startDate);
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

  it("should include start dates outside the recurrence rule", () => {
    // Add an extra date outside the recurrence (e.g., a Friday)
    const startDateOnMonday = dayjs().startOf("week").add(1, "day");
    const startDate = startDateOnMonday.toDate();
    const rule = [`RRULE:FREQ=WEEKLY;COUNT=0;BYDAY=${RRule.FR}`];
    const baseEvent = createMockBaseEvent({ startDate, recurrence: { rule } });
    const _id = new ObjectId(baseEvent._id);
    const rrule = new CompassEventRRule({ ...baseEvent, _id });

    const allDates = rrule.all();

    expect(allDates).toHaveLength(1);

    expect(allDates.some((d) => dayjs(d).isSame(startDateOnMonday))).toBe(true);
  });

  it("should correctly merge options when multiple rrules are present", () => {
    const rule = [
      "RRULE:FREQ=DAILY;COUNT=2",
      "RRULE:FREQ=WEEKLY;COUNT=1;BYDAY=FR",
    ];
    const baseEvent = createMockBaseEvent({ recurrence: { rule } });
    const _id = new ObjectId(baseEvent._id);
    const rrule = new CompassEventRRule({ ...baseEvent, _id });

    // Should include both daily and weekly recurrences
    const allDates = rrule.all();
    expect(allDates.length).toBeGreaterThanOrEqual(2);

    // Options should merge both rules
    expect(rrule.options.freq).toBeDefined();
    expect(rrule.options.count).toBeDefined();
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

      expect(base.metadata?.id).not.toBeDefined();
      expect(base.metadata?.id).not.toBeNull();

      const providerBase = rrule.base();

      expect(providerBase.metadata?.id).toEqual(baseEvent._id.toString());
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
      const startDate = dayjs(baseEvent.startDate);
      const endDate = dayjs(baseEvent.endDate);

      instances.forEach((instance, index) => {
        expect(instance.startDate).toBeDefined();
        expect(instance.endDate).toBeDefined();

        expect(instance.startDate).toEqual(
          startDate.add(index, "day").toDate(),
        );

        expect(instance.endDate).toEqual(endDate.add(index, "day").toDate());
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
      const startDate = dayjs(baseEvent.startDate);
      const endDate = dayjs(baseEvent.endDate);

      instances.forEach((instance, index) => {
        expect(instance.startDate).toBeDefined();
        expect(instance.endDate).toBeDefined();

        expect(instance.startDate).toEqual(
          startDate.add(index, "day").toDate(),
        );

        expect(instance.endDate).toEqual(endDate.add(index, "day").toDate());
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
      const providerInstances = rrule.instances();

      instances.forEach((instance) => {
        expect(instance._id).toBeDefined();
        expect(instance.metadata?.id).not.toBeDefined();
        expect(instance.metadata?.id).not.toBeNull();
        expect(instance.metadata?.recurringEventId).not.toBeDefined();
        expect(instance.metadata?.recurringEventId).not.toBeNull();
      });

      providerInstances.forEach((instance) => {
        expect(instance._id).toBeDefined();
        expect(instance.metadata?.id).toBeDefined();
        expect(instance.metadata?.recurringEventId).toBeDefined();
      });
    });

    it("should have times and timezones that match a real gcal event", () => {
      const baseCompassId = new ObjectId();

      const compassEvents = recurring.map((gEvent) => {
        const isInstance = isInstanceGCalEvent(gEvent);
        const _id = isInstance ? new ObjectId() : baseCompassId;

        const event = MapGCalEvent.toEvent(gEvent, {
          origin: Origin.GOOGLE_IMPORT,
          calendar: new ObjectId(),
          _id,
        });

        if (isInstance) {
          event.recurrence = {
            eventId: baseCompassId,
            rule: RecurrenceRuleSchema.parse(gEvent.recurrence),
          };
        }

        return event;
      });

      const baseEvent = compassEvents.find(isBase);

      expect(baseEvent).toBeDefined();
      expect(baseEvent).not.toBeNull();

      const rrule = new CompassEventRRule(BaseEventSchema.parse(baseEvent));
      const compassInstances = compassEvents.filter(isInstance);
      const instances = rrule.instances();

      instances.forEach((instance, index) => {
        const compassInstance = compassInstances[index];

        expect(compassInstance).toBeDefined();
        expect(compassInstance).not.toBeNull();

        expect(instance.startDate).toBeDefined();
        expect(instance.startDate).not.toBeNull();
        expect(instance.endDate).toBeDefined();
        expect(instance.endDate).not.toBeNull();

        const startDate = dayjs(instance.startDate!);
        const endDate = dayjs(instance.endDate!);
        const cStartDate = dayjs(compassInstance!.startDate!);
        const cEndDate = dayjs(compassInstance!.endDate!);

        expect(startDate.isSame(cStartDate)).toBe(true);
        expect(endDate.isSame(cEndDate)).toBe(true);
      });
    });
  });
});
