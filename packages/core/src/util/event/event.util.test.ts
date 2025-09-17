import { RRule, rrulestr } from "rrule";
import { faker } from "@faker-js/faker";
import dayjs from "@core/util/date/dayjs";
import {
  categorizeEvents,
  diffRRuleOptions,
} from "@core/util/event/event.util";
import {
  createMockBaseEvent,
  createMockInstance,
  createMockStandaloneEvent,
} from "@core/util/test/ccal.event.factory";

describe("categorizeEvents", () => {
  it("should categorize events correctly", () => {
    const standalone = createMockStandaloneEvent();
    const gEventId = faker.string.alphanumeric(16).toLowerCase();
    const base = createMockBaseEvent({ gEventId });
    const instance = createMockInstance(base._id, gEventId);
    const events = [base, instance, standalone];

    const { baseEvents, instances, standaloneEvents } =
      categorizeEvents(events);

    expect(baseEvents).toEqual([base]);
    expect(instances).toEqual([instance]);
    expect(standaloneEvents).toEqual([standalone]);
  });
});

describe("diffRRuleOptions", () => {
  it("should return the differences between two rrule options", () => {
    const until = dayjs();
    const untilRule = `UNTIL=${until.toRRuleDTSTARTString()}`;
    const rule = `RRULE:FREQ=DAILY;COUNT=10;BYDAY=MO,WE,FR;${untilRule}`;
    const rrule = rrulestr(rule);
    const untilFormat = dayjs.DateFormat.RFC5545;
    const nextUntil = dayjs(until.toRRuleDTSTARTString(), untilFormat);

    const rruleA = new RRule({
      tzid: rrule.options.tzid,
      freq: RRule.DAILY, // DAILY
      count: 10,
      byweekday: [RRule.MO.weekday, RRule.WE.weekday, RRule.FR.weekday], // MO, WE, FR
      interval: 1,
      until: nextUntil.toDate(), // new until date
    });

    const rruleB = new RRule({
      tzid: rrule.options.tzid,
      freq: RRule.DAILY, // DAILY
      count: 10,
      byweekday: [RRule.MO.weekday, RRule.WE.weekday, RRule.FR.weekday], // MO, WE, FR
      interval: 2,
      until: nextUntil.add(10, "minutes").toDate(), // new until date
    });

    const diffsA = diffRRuleOptions(rrule, rruleA);
    const diffsB = diffRRuleOptions(rrule, rruleB);

    expect(diffsA).toBeInstanceOf(Array);
    expect(diffsA).toHaveLength(0);

    expect(diffsB).toBeInstanceOf(Array);
    expect(diffsB).toHaveLength(2);

    expect(diffsB).toEqual(
      expect.arrayContaining([
        ["interval", 1],
        ["until", expect.any(Date)],
      ]),
    );
  });
});
