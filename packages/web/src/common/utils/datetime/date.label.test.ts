import { getTimesLabel } from "@web/common/utils/datetime/web.date.util";

const meridians = (label: string) =>
  (label.match(/am/gi) || label.match(/pm/gi) || []).length;

describe("Time Labels", () => {
  it("removes minutes and am/pm when possible", () => {
    const morningLabel = getTimesLabel(
      "2022-07-06T06:00:00-05:00",
      "2022-07-06T07:00:00-05:00",
    );
    expect(meridians(morningLabel)).toBe(1);

    const eveningLabel = getTimesLabel(
      "2022-07-06T20:00:00-05:00",
      "2022-07-06T23:00:00-05:00",
    );
    expect(meridians(eveningLabel)).toBe(1);
  });

  // Counting meridiems missed that dropping the start's took its trailing
  // space with it, so every same-meridiem label - most of them - rendered as
  // "6  - 7 AM" on the card and in its aria-label. Assert the whole string.
  it("reads as one range when both ends share a meridiem", () => {
    expect(
      getTimesLabel("2022-07-06T06:00:00-05:00", "2022-07-06T07:00:00-05:00"),
    ).toBe("6 - 7 AM");
    expect(
      getTimesLabel("2022-07-06T10:45:00-05:00", "2022-07-06T11:00:00-05:00"),
    ).toBe("10:45 - 11 AM");
  });

  it("keeps both meridiems when the range crosses noon", () => {
    expect(
      getTimesLabel("2022-07-06T11:00:00-05:00", "2022-07-06T13:00:00-05:00"),
    ).toBe("11 AM - 1 PM");
  });

  it("preserves am/pm when needed", () => {
    const label = getTimesLabel(
      "2022-07-06T01:00:00-05:00",
      "2022-07-06T18:00:00-05:00",
    );
    expect(label.includes("AM")).toBe(true);
    expect(label.includes("PM")).toBe(true);
  });
  it("preserves minutes when needed", () => {
    const label = getTimesLabel(
      "2022-07-06T09:45:00-05:00",
      "2022-07-06T19:15:00-05:00",
    );
    expect(label.includes(":45")).toBe(true);
    expect(label.includes(":15")).toBe(true);
  });
});
