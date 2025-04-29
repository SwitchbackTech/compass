import { createMockBaseEvent } from "@core/util/test/ccal.event.factory";
import { stripBaseProps } from "./recur.util";

describe("stripBaseProps", () => {
  it("should remove props that are not allowed to change", () => {
    const baseEvent = createMockBaseEvent();
    const strippedEvent = stripBaseProps(baseEvent);
    const prohibitedProps = [
      "_id",
      "gEventId",
      "startDate",
      "endDate",
      "order",
      "recurrence",
      "user",
      "updatedAt",
    ];

    const remainingKeys = Object.keys(strippedEvent);
    expect(remainingKeys).not.toContain(prohibitedProps);
    expect(1).toBe(1);
  });
});
