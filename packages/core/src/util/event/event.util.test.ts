import { Frequency } from "rrule";
import { faker } from "@faker-js/faker";
import {
  InstanceEventSchema,
  Schema_Base_Event,
  Schema_Regular_Event,
} from "@core/types/event.types";
import { UserMetadata } from "@core/types/user.types";
import dayjs from "@core/util/date/dayjs";
import {
  categorizeEvents,
  categorizeRecurringEvents,
  filterBaseEvents,
  filterExistingInstances,
  getMongoUpdateDiff,
  hasRRule,
  isAllDay,
  isBase,
  isInstance,
  isRegular,
  shouldImportGCal,
} from "@core/util/event/event.util";
import {
  createMockBaseEvent,
  createMockInstances,
  createMockRegularEvent,
} from "@core/util/test/ccal.event.factory";
import { Priorities } from "../../constants/core.constants";
import { CompassEventRRule } from "./compass.event.rrule";

describe("categorizeEvents", () => {
  it("should categorize events correctly", () => {
    const standalone = createMockRegularEvent();
    const gEventId = faker.string.alphanumeric(16).toLowerCase();
    const base = createMockBaseEvent({ metadata: { id: gEventId } });
    const [instance] = createMockInstances(base, 1);
    const events = [base, InstanceEventSchema.parse(instance), standalone];

    const { baseEvents, instances, regularEvents } = categorizeEvents(events);

    expect(baseEvents).toEqual([base]);
    expect(instances).toEqual([instance]);
    expect(regularEvents).toEqual([standalone]);
  });

  it("should return empty arrays when given no events", () => {
    const { baseEvents, instances, regularEvents } = categorizeEvents([]);
    expect(baseEvents).toEqual([]);
    expect(instances).toEqual([]);
    expect(regularEvents).toEqual([]);
  });
});

describe("categorizeRecurringEvents", () => {
  it("should separate base event from its instances", () => {
    const base = createMockBaseEvent();
    const createdInstances = createMockInstances(base, 3);
    const { baseEvent, instances } = categorizeRecurringEvents([
      ...createdInstances,
      base,
    ]);

    expect(baseEvent).toEqual(expect.objectContaining(base));
    expect(instances).toEqual(expect.arrayContaining(createdInstances));
  });

  it("throws when no base event present", () => {
    const base = createMockBaseEvent();
    const instances = createMockInstances(base, 3);
    expect(() => categorizeRecurringEvents(instances)).toThrow(
      /Expected exactly one base event, found 0/,
    );
  });

  it("throws when multiple base events present", () => {
    const base1 = createMockBaseEvent();
    const base2 = createMockBaseEvent();
    const instances = createMockInstances(base1);
    expect(() =>
      categorizeRecurringEvents([...instances, base1, base2]),
    ).toThrow(/Expected exactly one base event, found 2/);
  });
});

describe("isAllDay", () => {
  it("should detect an all-day event spanning midnight to next midnight", () => {
    const base = createMockRegularEvent();
    const start = dayjs(base.startDate).startOf("day");
    const end = start.add(1, "day");
    const allDayEvent = {
      ...base,
      startDate: start.toDate(),
      endDate: end.toDate(),
    };
    expect(isAllDay(allDayEvent)).toBe(true);
  });

  it("should return false for an event not starting at midnight", () => {
    const base = createMockRegularEvent();
    const start = dayjs(base.startDate).hour(9).minute(0).second(0);
    const end = start.add(2, "hour");
    const event = {
      ...base,
      startDate: start.toDate(),
      endDate: end.toDate(),
    };
    expect(isAllDay(event)).toBe(false);
  });

  it("should return false for an event longer than one day", () => {
    const base = createMockRegularEvent();
    const start = dayjs(base.startDate).startOf("day");
    const end = start.add(2, "day");
    const event = {
      ...base,
      startDate: start.toDate(),
      endDate: end.toDate(),
    };
    expect(isAllDay(event)).toBe(false);
  });
});

describe("recurrence predicates", () => {
  it("should identify base, instance, and regular events", () => {
    const base = createMockBaseEvent();
    const [instanceRaw] = createMockInstances(base, 1);
    const instance = InstanceEventSchema.parse(instanceRaw);
    const regular = createMockRegularEvent();

    expect(isBase(base)).toBe(true);
    expect(isInstance(instance)).toBe(true);
    expect(isRegular(regular)).toBe(true);

    expect(isBase(instance)).toBe(false);
    expect(isInstance(base)).toBe(false);
    expect(isRegular(base)).toBe(false);
  });

  it("hasRRule should be true only for series events", () => {
    const base = createMockBaseEvent();
    const [instanceRaw] = createMockInstances(base, 1);
    const instance = InstanceEventSchema.parse(instanceRaw);
    const regular = createMockRegularEvent();

    expect(hasRRule(base)).toBe(true);
    expect(hasRRule(instance)).toBe(true);
    expect(hasRRule(regular)).toBe(false);
  });
});

describe("filters", () => {
  it("filterBaseEvents should return only base events", () => {
    const base = createMockBaseEvent();
    const [instanceRaw] = createMockInstances(base, 1);
    const instance = InstanceEventSchema.parse(instanceRaw);
    const regular = createMockRegularEvent();
    const events = [base, instance, regular];
    expect(filterBaseEvents(events)).toEqual([base]);
  });

  it("filterExistingInstances should return only instances", () => {
    const base = createMockBaseEvent();
    const [i1Raw, i2Raw] = createMockInstances(base, 2);
    const i1 = InstanceEventSchema.parse(i1Raw);
    const i2 = InstanceEventSchema.parse(i2Raw);
    const regular = createMockRegularEvent();
    const events = [base, i1, i2, regular];
    expect(filterExistingInstances(events)).toEqual([i1, i2]);
  });
});

describe("shouldImportGCal", () => {
  const baseMeta = (state?: string): UserMetadata =>
    ({
      sync: state ? { importGCal: state } : undefined,
    }) as UserMetadata;

  it("returns false for importing state", () => {
    expect(shouldImportGCal(baseMeta("importing"))).toBe(false);
  });
  it("returns false for completed state", () => {
    expect(shouldImportGCal(baseMeta("completed"))).toBe(false);
  });
  it("returns true for restart state", () => {
    expect(shouldImportGCal(baseMeta("restart"))).toBe(true);
  });
  it("returns true for errored state", () => {
    expect(shouldImportGCal(baseMeta("errored"))).toBe(true);
  });
  it("returns true when state missing", () => {
    expect(shouldImportGCal(baseMeta())).toBe(true);
  });
});

describe("getMongoUpdateDiff", () => {
  it("returns empty object when no changes", () => {
    const event = createMockRegularEvent();
    const diff = getMongoUpdateDiff(event, { ...event });

    expect(diff).toEqual({});
  });

  describe("$unset:", () => {
    it("returns an empty string for null or undefined fields", () => {
      const original = createMockRegularEvent();
      const updated: Schema_Regular_Event = Object.assign({
        ...original,
        startDate: undefined,
        endDate: null,
        updatedAt: 0,
      });

      const diff = getMongoUpdateDiff(updated, original);

      expect(diff.$unset).toHaveProperty("startDate", "");
      expect(diff.$unset).toHaveProperty("endDate", "");
      expect(diff.$set).toHaveProperty("updatedAt", updated.updatedAt);
      expect(Object.keys(diff.$unset!)).toHaveLength(2);
      expect(Object.keys(diff.$set!)).toHaveLength(1);
    });
  });

  describe("$set:", () => {
    it("returns the correct field $set changes if the existing object is undefined", () => {
      const updated = createMockRegularEvent();

      expect(getMongoUpdateDiff(updated).$set).toEqual(updated);
      expect(getMongoUpdateDiff(updated, null).$set).toEqual(updated);
    });

    it("returns Date field changes", () => {
      const original = createMockRegularEvent();
      const updated: Schema_Regular_Event = {
        ...original,
        startDate: dayjs(original.startDate).add(1, "hour").toDate(),
        endDate: dayjs(original.endDate).add(1, "hour").toDate(),
        updatedAt: dayjs().add(2, "seconds").toDate(),
      };

      const diff = getMongoUpdateDiff(updated, original);

      expect(diff.$set).toHaveProperty("startDate", updated.startDate);
      expect(diff.$set).toHaveProperty("endDate", updated.endDate);
      expect(diff.$set).toHaveProperty("updatedAt", updated.updatedAt);
      expect(Object.keys(diff.$set!)).toHaveLength(3);
    });

    it("returns String field changes", () => {
      const original = createMockRegularEvent({ priority: Priorities.WORK });

      const updated: Schema_Regular_Event = {
        ...original,
        description: faker.lorem.sentence(),
        title: faker.lorem.words(3),
        priority: Priorities.RELATIONS,
      };

      const diff = getMongoUpdateDiff(updated, original);

      expect(diff.$set).toHaveProperty("title", updated.title);
      expect(diff.$set).toHaveProperty("description", updated.description);
      expect(diff.$set).toHaveProperty("priority", updated.priority);
      expect(Object.keys(diff.$set!)).toHaveLength(3);
    });

    it("returns Number field changes", () => {
      const original = createMockRegularEvent();

      const updated: Schema_Regular_Event = {
        ...original,
        order: original.order + 1,
      };

      const diff = getMongoUpdateDiff(updated, original);

      expect(diff.$set).toHaveProperty("order", updated.order);
      expect(Object.keys(diff.$set!)).toHaveLength(1);
    });

    it("returns Boolean field changes", () => {
      const original = createMockRegularEvent();

      const updated: Schema_Regular_Event = {
        ...original,
        isSomeday: !original.isSomeday,
      };

      const diff = getMongoUpdateDiff(updated, original);

      expect(diff.$set).toHaveProperty("isSomeday", updated.isSomeday);
      expect(Object.keys(diff.$set!)).toHaveLength(1);
    });

    it("returns Array field changes", () => {
      const original = createMockBaseEvent();

      const updated: Schema_Base_Event = {
        ...original,
        recurrence: {
          ...original.recurrence,
          rule: new CompassEventRRule(original, {
            freq: Frequency.YEARLY,
            interval: 2,
            count: 7,
            byyearday: 30,
          }).toRecurrence(),
        },
      };

      const diff = getMongoUpdateDiff(updated, original);

      expect(diff.$set).toEqual(
        expect.objectContaining({
          "recurrence.rule.0": updated.recurrence?.rule?.[0],
        }),
      );
      expect(Object.keys(diff.$set!)).toHaveLength(1);
    });
  });
});
