import { ObjectId } from "bson";
import { Origin, Priorities } from "@core/constants/core.constants";
import { type Schema_SomedayEvent } from "../types/web.event.types";
import {
  validateSomedayEvent,
  validateSomedayEvents,
} from "./someday.event.validator";

describe("someday.event.validator", () => {
  function createSomedayEvent(
    overrides: Partial<Schema_SomedayEvent> = {},
  ): Schema_SomedayEvent {
    return {
      _id: new ObjectId().toString(),
      title: "test someday",
      startDate: "2023-01-01",
      endDate: "2023-01-08",
      isSomeday: true,
      origin: Origin.COMPASS,
      priority: Priorities.UNASSIGNED,
      user: "user-1",
      order: 1,
      ...overrides,
    };
  }

  it("validates a correct someday event", () => {
    const event = createSomedayEvent();

    const parsed = validateSomedayEvent(event);

    expect(parsed).toEqual(event);
  });

  it("normalizes null recurrence for a someday event", () => {
    const event = {
      ...createSomedayEvent(),
      recurrence: null,
    } as unknown as Schema_SomedayEvent & { recurrence: null };

    const parsed = validateSomedayEvent(event);

    expect(parsed.recurrence).toBeUndefined();
  });

  it("normalizes null recurrence in bulk validation", () => {
    const events = [
      createSomedayEvent({ _id: new ObjectId().toString(), order: 1 }),
      {
        ...createSomedayEvent({ _id: new ObjectId().toString(), order: 2 }),
        recurrence: null,
      } as unknown as Schema_SomedayEvent & { recurrence: null },
    ];

    const parsed = validateSomedayEvents(events);

    expect(parsed).toHaveLength(2);
    expect(parsed[1]?.recurrence).toBeUndefined();
  });
});
