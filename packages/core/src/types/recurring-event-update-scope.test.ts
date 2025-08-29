import { RecurringEventUpdateScope } from "./event.types";

describe("RecurringEventUpdateScope", () => {
  it("should have the correct enum values", () => {
    expect(RecurringEventUpdateScope.THIS_EVENT).toBe("This Event");
    expect(RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS).toBe(
      "This and Following Events",
    );
    expect(RecurringEventUpdateScope.ALL_EVENTS).toBe("All Events");
  });

  it("should have all required enum members", () => {
    const enumValues = Object.values(RecurringEventUpdateScope);
    expect(enumValues).toHaveLength(3);
    expect(enumValues).toContain("This Event");
    expect(enumValues).toContain("This and Following Events");
    expect(enumValues).toContain("All Events");
  });

  it("should have correct enum keys", () => {
    const enumKeys = Object.keys(RecurringEventUpdateScope);
    expect(enumKeys).toHaveLength(3);
    expect(enumKeys).toContain("THIS_EVENT");
    expect(enumKeys).toContain("THIS_AND_FOLLOWING_EVENTS");
    expect(enumKeys).toContain("ALL_EVENTS");
  });
});
