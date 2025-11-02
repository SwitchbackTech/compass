import { faker } from "@faker-js/faker";
import { MapEvent } from "@core/mappers/map.event";
import {
  createMockBaseEvent,
  createMockInstances,
  createMockRegularEvent,
} from "@core/util/test/ccal.event.factory";

describe("MapEvent.removeProviderData", () => {
  it("removes provider metadata from a regular event", () => {
    const event = createMockRegularEvent();
    const result = MapEvent.removeProviderMetadata(event);

    expect(result).not.toHaveProperty("metadata");
  });

  it("removes provider metadata from a base event", () => {
    const event = createMockBaseEvent();
    const result = MapEvent.removeProviderMetadata(event);

    expect(result).not.toHaveProperty("metadata");
  });

  it("removes provider metadata from an instance event", () => {
    const base = createMockBaseEvent();
    const instances = createMockInstances(base, 3);
    const event = faker.helpers.arrayElement(instances);
    const result = MapEvent.removeProviderMetadata(event);

    expect(result).not.toHaveProperty("metadata");
  });
});
