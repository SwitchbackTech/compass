import {
  getTimesLabel,
  shouldAdjustComplimentTime,
  shouldAdjustComplimentaryTime,
} from "@web/common/utils/web.date.util";

const meridians = (label: string) =>
  (label.match(/am/gi) || label.match(/pm/gi) || []).length;

describe("Time Options", () => {
  it("recognizes adjustment needed after changing start", () => {
    const impossibleStart = shouldAdjustComplimentTime("start", {
      oldStart: "1:00 AM",
      oldEnd: "2:00 AM",

      start: "5:00 AM",
      end: "2:00 AM", // should be 600
    });

    expect(impossibleStart.shouldAdjust).toBe(true);
    expect(impossibleStart.adjustment).toBe(240);

    const sameStartAsEnd = shouldAdjustComplimentTime("start", {
      oldStart: "7:00 PM",
      oldEnd: "7:15 PM",

      start: "7:15 PM",
      end: "7:15 PM", // should be 730
    });

    expect(sameStartAsEnd.shouldAdjust).toBe(true);
    expect(sameStartAsEnd.adjustment).toBe(15);

    const noAdjustment = shouldAdjustComplimentTime("start", {
      oldStart: "9:45 PM",
      oldEnd: "11:45 PM",

      start: "5 PM",
      end: "11:45 PM",
    });

    expect(noAdjustment.shouldAdjust).toBe(false);
  });

  it("recognizes adjustment needed after changing end", () => {
    const impossibleEnd = shouldAdjustComplimentTime("end", {
      oldStart: "11:00 AM",
      oldEnd: "2:00 PM",

      start: "11:00 AM", // should be 6 PM, 5 hr adjustment
      end: "9:00 AM",
    });

    expect(impossibleEnd.shouldAdjust).toBe(true);
    expect(impossibleEnd.adjustment).toBe(60 * 5);

    const sameStartAsEnd = shouldAdjustComplimentTime("end", {
      oldStart: "7:00 PM",
      oldEnd: "7:15 PM",

      start: "7:15 PM",
      end: "7:00 PM",
    });

    expect(sameStartAsEnd.shouldAdjust).toBe(true);
    expect(sameStartAsEnd.adjustment).toBe(30);

    const noAdjustment = shouldAdjustComplimentTime("end", {
      oldStart: "9:45 PM",
      oldEnd: "11:45 PM",

      start: "5 PM",
      end: "11:45 PM",
    });

    expect(noAdjustment.shouldAdjust).toBe(false);
  });
});
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
