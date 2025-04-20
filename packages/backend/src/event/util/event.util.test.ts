import {
  createMockInstance,
  createMockStandaloneEvent,
} from "@backend/__tests__/mocks.ccal/ccal.event.factory";
import { createMockBaseEvent } from "@backend/__tests__/mocks.ccal/ccal.event.factory";
import { categorizeEvents } from "./event.util";

describe("categorizeEvents", () => {
  it("should categorize events correctly", () => {
    const standalone = createMockStandaloneEvent();
    const base = createMockBaseEvent();
    const instance = createMockInstance(base._id);
    const events = [base, instance, standalone];

    const { baseEvents, instances, regularEvents } = categorizeEvents(events);

    expect(baseEvents).toEqual([base]);
    expect(instances).toEqual([instance]);
    expect(regularEvents).toEqual([standalone]);
  });
});
