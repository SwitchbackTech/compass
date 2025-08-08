import { faker } from "@faker-js/faker";
import { categorizeEvents } from "@core/util/event/event.util";
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
