import { isEventInRange } from "./event.util";

describe("isEventInRange", () => {
  it("returns true if event is in range", () => {
    const event = { start: "2022-03-15", end: "2022-03-15" };
    const dates = {
      start: "2022-03-14",
      end: "2022-03-19",
    };
    expect(isEventInRange(event, dates)).toBe(true);
  });
  it("returns false if event is not in range", () => {
    const event = { start: "2022-03-15", end: "2022-03-15" };
    const dates = {
      start: "2022-03-16",
      end: "2022-03-19",
    };
    expect(isEventInRange(event, dates)).toBe(false);
  });
});
