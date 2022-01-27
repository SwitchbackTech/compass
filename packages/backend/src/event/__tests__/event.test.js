import { MapEvent } from "@core/mappers/map.event";

import { gcalEvents } from "@core/demo-data/data.gcal.event";
import { Origin } from "@core/core.constants";

describe("Map Event: GCal -> CCal", () => {
  test("skips cancelled events", () => {
    // future: run schema validation
    const i = gcalEvents.items;
    const events = MapEvent.toCompass("someId", i, Origin.Google);

    let hasCancelledEvent = false;
    events.forEach((e) => {
      if (e.status === "cancelled") {
        hasCancelledEvent = true;
        return;
      }
    });

    expect(hasCancelledEvent).toBe(false);
  });
});
