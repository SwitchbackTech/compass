import dayjs from "dayjs";
import { mar13To19 } from "@core/__mocks__/events.allday.3";
import {
  fitInExistingRow,
  getAllDayRowData,
  getPrevDayWidth,
  getFlexBasis,
} from "@web/common/utils/grid.util";
import {
  FLEX_TODAY,
  FLEX_TMRW,
  FUTURE_MULTIPLE,
  FLEX_EQUAL,
} from "@web/common/constants/grid.constants";
describe("fitInExistingRow", () => {
  it("doesnt fit when row full: 2022-23", () => {
    const rows = {
      0: [["2022-12-01", "2023-02-02"]],
    };
    const eventThatDoesntFit = {
      startDate: "2022-12-15",
      endDate: "2022-01-02",
    };
    const fitResult = fitInExistingRow(eventThatDoesntFit, rows);
    expect(fitResult.fits).toBe(false);
  });
  it("fits event in row 2: mar13-19", () => {
    /*
      ++++ = event being tested
      r = row number
  
      r | 13  14  15  16  17  18  19  
      4 | <------------------------>
      3 |    ----------
      2 |    --   ++++++
      1 |    ----------
      0 |    --  --  -- --
      */

    const rows = {
      0: [
        ["2022-01-14", "2022-03-15"],
        ["2022-03-17", "2022-03-18"],
        ["2022-03-16", "2022-03-17"],
        ["2022-03-15", "2022-03-16"],
      ],
      1: [["2022-03-14", "2022-03-17"]],
      2: ["2022-03-14", "2022-03-15"],
      3: ["2022-03-14", "2022-03-17"],
      4: ["2022-01-01", "2022-03-22"],
      5: [],
      6: [],
    };
    const eventThatFits = {
      startDate: "2022-03-15",
      endDate: "2022-03-17",
    };
    const fitResult = fitInExistingRow(eventThatFits, rows);
    expect(fitResult.fits).toBe(true);
    expect(fitResult.rowNum).toBe(2);
  });
});
describe("getAllDayRowData", () => {
  it("doesnt create unnecessary rows: tbd", () => {});
  test("March 13 - 19", () => {
    const rowData = getAllDayRowData(mar13To19);
    const y = 1;
  });
});
describe("getFlexBasis", () => {
  test("past week: all same", () => {
    const july10 = dayjs("2022-07-10");
    const weekInFocus = 50;
    const decWeekDays = [
      "2022-07-10",
      "2022-07-11",
      "2022-07-12",
      "2022-07-13",
      "2022-07-14",
      "2022-07-15",
      "2022-07-16",
    ];

    decWeekDays.forEach((d) => {
      expect(getFlexBasis(dayjs(d), weekInFocus, july10)).toBe(FLEX_EQUAL);
    });
  });

  test("future week: all same", () => {
    const jan1 = dayjs("2022-01-01");
    const weekInFocus = 40;
    const decWeekDays = [
      "2022-12-18",
      "2022-12-19",
      "2022-12-20",
      "2022-12-21",
      "2022-12-22",
      "2022-12-23",
      "2022-12-24",
    ];

    decWeekDays.forEach((d) => {
      expect(getFlexBasis(dayjs(d), weekInFocus, jan1)).toBe(FLEX_EQUAL);
    });
  });
});
describe("regular week: March 6-12", () => {
  const mar9 = dayjs("2022-03-09");
  const week = mar9.week();
  const prevDayWidth = getPrevDayWidth(mar9);
  test("Sun - Tue", () => {
    const pastDays = ["2022-03-06", "2022-03-07", "2022-03-08"];
    pastDays.forEach((d) => {
      expect(getFlexBasis(dayjs(d), week, mar9)).toBe(prevDayWidth);
    });
  });

  test("Wed [today]", () => {
    expect(getFlexBasis(mar9, week, mar9)).toBe(FLEX_TODAY);
  });
  test("Thu", () => {
    expect(getFlexBasis(dayjs("2022-03-10"), week, mar9)).toBe(FLEX_TMRW);
  });
  test("Fri - Sat", () => {
    const futureDays = ["2022-03-11", "2022-03-12"];
    futureDays.forEach((d) => {
      expect(getFlexBasis(dayjs(d), week, mar9)).toBe(
        prevDayWidth * FUTURE_MULTIPLE
      );
    });
  });
});

describe("beginning of month: Feb 27 - Mar 5", () => {
  const today = dayjs("2022-03-04");
  const weekInFocus = today.week();
  const prevDayWidth = getPrevDayWidth(today);
  test("Sun - Thu", () => {
    const pastDays = [
      "2022-02-27",
      "2022-02-28",
      "2022-03-01",
      "2022-03-02",
      "2022-03-03",
    ];
    pastDays.forEach((d) => {
      expect(getFlexBasis(dayjs(d), weekInFocus, today)).toBe(prevDayWidth);
    });
  });

  test("Fri [today]", () => {
    expect(getFlexBasis(dayjs("2022-03-04"), weekInFocus, today)).toBe(
      FLEX_TODAY
    );
  });

  test("Sat", () => {
    expect(getFlexBasis(dayjs("2022-03-05"), weekInFocus, today)).toBe(
      FLEX_TMRW
    );
  });
});

describe("end of month: Mar 27 - Apr 2", () => {
  const today = dayjs("2022-03-31");
  const weekInFocus = today.week();
  const prevDayWidth = getPrevDayWidth(today);
  test("Sun - Wed ", () => {
    const pastDays = ["2022-03-27", "2022-03-28", "2022-03-29", "2022-03-30"];
    pastDays.forEach((d) => {
      expect(getFlexBasis(dayjs(d), weekInFocus, today)).toBe(prevDayWidth);
    });
  });

  test("Thu [today]", () => {
    expect(getFlexBasis(dayjs("2022-03-31"), weekInFocus, today)).toBe(
      FLEX_TODAY
    );
  });
  test("Fri", () => {
    expect(getFlexBasis(dayjs("2022-04-01"), weekInFocus, today)).toBe(
      FLEX_TMRW
    );
  });
  test("Sat", () => {
    expect(getFlexBasis(dayjs("2022-04-02"), weekInFocus, today)).toBe(
      prevDayWidth * FUTURE_MULTIPLE
    );
  });
});
