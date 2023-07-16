import { getTimesLabel } from "@web/common/utils/web.date.util";

const meridians = (label: string) =>
  (label.match(/am/gi) || label.match(/pm/gi) || []).length;

describe("Time Labels", () => {
  it("removes minutes and am/pm when possible", () => {
    const morningLabel = getTimesLabel(
      "2022-07-06T06:00:00-05:00",
      "2022-07-06T07:00:00-05:00"
    );
    expect(meridians(morningLabel)).toBe(1);

    const eveningLabel = getTimesLabel(
      "2022-07-06T20:00:00-05:00",
      "2022-07-06T23:00:00-05:00"
    );
    expect(meridians(eveningLabel)).toBe(1);
  });

  it("preserves am/pm when needed", () => {
    const label = getTimesLabel(
      "2022-07-06T01:00:00-05:00",
      "2022-07-06T18:00:00-05:00"
    );
    expect(label.includes("AM")).toBe(true);
    expect(label.includes("PM")).toBe(true);
  });
  it("preserves minutes when needed", () => {
    const label = getTimesLabel(
      "2022-07-06T09:45:00-05:00",
      "2022-07-06T19:15:00-05:00"
    );
    expect(label.includes(":45")).toBe(true);
    expect(label.includes(":15")).toBe(true);
  });
});
