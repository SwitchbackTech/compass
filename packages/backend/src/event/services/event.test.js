import { GcalMapper } from "@common/services/gcal/map.gcal";

import { gcalEvents } from "./test.gcal.data";

describe("Map: GCal -> CCal", () => {
  test("skips cancelled events", () => {
    // future: run schema validation
    const i = gcalEvents.items;
    const events = GcalMapper.toCompass("someId", i);

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
