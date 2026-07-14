import { ObjectId } from "bson";
import { MapEvent } from "@core/mappers/map.event";
import { type CompassEvent } from "@core/types/compass-event.contracts";
import {
  createMockBaseEvent,
  createMockInstance,
} from "@core/util/test/ccal.event.factory";

describe("MapEvent.removeProviderData", () => {
  it("removes gEventId from a base event", () => {
    const _id = new ObjectId().toString();
    const event = createMockBaseEvent({ _id, gEventId: _id });
    const result = MapEvent.removeProviderData(event);

    expect((result as CompassEvent).gEventId).toBeUndefined();
  });

  it("removes gEventId, gRecurringEventId and recurrence eventId from an instance event", () => {
    const _id = new ObjectId().toString();
    const event = createMockInstance(_id, _id);
    const result = MapEvent.removeProviderData(event);

    expect((result as CompassEvent).gEventId).toBeUndefined();
    expect((result as CompassEvent).gRecurringEventId).toBeUndefined();
    expect((result as CompassEvent).recurrence?.eventId).toBeUndefined();
  });
});
