import { faker } from "@faker-js/faker";
import { InstanceEventSchema } from "@core/types/event.types";
import { categorizeEvents } from "@core/util/event/event.util";
import {
  createMockBaseEvent,
  createMockInstances,
  createMockRegularEvent,
} from "@core/util/test/ccal.event.factory";

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
});
