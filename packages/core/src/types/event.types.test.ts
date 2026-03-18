import { EventUpdateSchema } from "@core/types/event.types";

describe("EventUpdateSchema", () => {
  it("normalizes null recurrence to a rule-null object", () => {
    const result = EventUpdateSchema.safeParse({
      recurrence: null,
    });

    expect(result.success).toBe(true);
    expect(result.data?.recurrence).toEqual({ rule: null });
  });

  it("keeps explicit recurrence payloads unchanged", () => {
    const recurrence = { rule: ["RRULE:FREQ=WEEKLY"] };
    const result = EventUpdateSchema.safeParse({
      recurrence,
    });

    expect(result.success).toBe(true);
    expect(result.data?.recurrence).toEqual(recurrence);
  });
});
