import { ObjectId } from "bson";
import { MapEvent } from "@core/mappers/map.event";
import { Schema_Event } from "@core/types/event.types";
import {
  createMockBaseEvent,
  createMockInstance,
} from "@core/util/test/ccal.event.factory";

describe("MapEvent.removeProviderData", () => {
  it("removes gEventId from a base event", () => {
    const _id = new ObjectId().toString();
    const event = createMockBaseEvent({ _id, gEventId: _id });
    const result = MapEvent.removeProviderData(event);

    expect((result as Schema_Event).gEventId).toBeUndefined();
  });

  it("removes gEventId, gRecurringEventId and recurrence eventId from an instance event", () => {
    const _id = new ObjectId().toString();
    const event = createMockInstance(_id, _id);
    const result = MapEvent.removeProviderData(event);

    expect((result as Schema_Event).gEventId).toBeUndefined();
    expect((result as Schema_Event).gRecurringEventId).toBeUndefined();
    expect((result as Schema_Event).recurrence?.eventId).toBeUndefined();
  });
});
