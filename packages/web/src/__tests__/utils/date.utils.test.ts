import { getTimesLabel } from "@web/common/utils/date.utils";

describe("time labels", () => {
  it("removes minutes and am/pm when possible", () => {
    const morningLabel = getTimesLabel(
      "2022-07-06T06:00:00-05:00",
      "2022-07-06T08:00:00-05:00"
    );
    expect(morningLabel).toBe("6 - 8am");

    const eveningLabel = getTimesLabel(
      "2022-07-06T20:00:00-05:00",
      "2022-07-06T23:00:00-05:00"
    );
    expect(eveningLabel).toBe("8 - 11pm");
  });

  it("preserves and am/pm when needed", () => {
    const label = getTimesLabel(
      "2022-07-06T01:00:00-05:00",
      "2022-07-06T18:00:00-05:00"
    );
    expect(label).toBe("1am - 6pm");
  });
  it("preserves minutes when needed", () => {
    const label = getTimesLabel(
      "2022-07-06T09:45:00-05:00",
      "2022-07-06T19:15:00-05:00"
    );
    expect(label).toBe("9:45am - 7:15pm");
  });
});
