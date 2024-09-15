import { adjustIsTimesShown, isEventInRange } from "./event.util";
describe("adjustIsTimesShown", () => {
  it("hides times for event in past week", () => {
    const event = adjustIsTimesShown({}, true, false);
    expect(event.isTimesShown).toBe(false);
  });
  it("hides times for event on previous day of current week", () => {
    const event = adjustIsTimesShown({}, true, true);
    expect(event.isTimesShown).toBe(false);
  });
  it("keeps isTimesShown false if it was originally", () => {
    const futureEvt = adjustIsTimesShown({ isTimesShown: false }, true, true);
    expect(futureEvt.isTimesShown).toBe(false);

    const pastEvt = adjustIsTimesShown({ isTimesShown: false }, false, false);
    expect(pastEvt.isTimesShown).toBe(false);
  });
  it("shows times for event in future week", () => {
    const event = adjustIsTimesShown({}, false, false);
    expect(event.isTimesShown).toBe(true);
  });
  it("shows times when future day of current week", () => {
    const event = adjustIsTimesShown({}, false, true);
    expect(event.isTimesShown).toBe(true);
  });
});

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
