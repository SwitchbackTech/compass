import dayjs from "dayjs";
import { mar13To19 } from "@core/__mocks__/events.allday.3";
import {
  assignEventToRow,
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

const assignsRowNumberToEachEvent = (events) => {
  let res = true;
  for (const e of events) {
    if (!("row" in e) || typeof e.row !== "number") {
      res = false;
      break;
    }
  }
  return res;
};

describe("assignEventToRow", () => {
  it("doesnt fit when row full: 2022-23", () => {
    const rows = {
      0: [["2022-12-01", "2023-02-02"]],
    };
    const eventThatDoesntFit = {
      startDate: "2022-12-15",
      endDate: "2022-01-02",
    };
    const fitResult = assignEventToRow(eventThatDoesntFit, rows);
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
    };
    const eventThatFits = {
      startDate: "2022-03-15",
      endDate: "2022-03-17",
    };
    const fitResult = assignEventToRow(eventThatFits, rows);
    expect(fitResult.fits).toBe(true);
    expect(fitResult.rowNum).toBe(2);
  });

  it("tbd", () => {
    /*
      ++++ = event being tested
      r = row number
  
      r | 13  14  15  16  17  18  19  
      6 |     ++  ------
      5 |     ----------
      4 | --------------
      3 |     --  --  --  -- 
      2 |     ----------------------> 
      1 | ------ ----------    
      */
    const rows = {
      1: [
        ["2022-03-13", "2022-03-15"],
        ["2022-03-15", "2022-03-18"],
        ["2022-03-14", "2022-03-22"],
      ],
      2: [
        ["2022-03-17", "2022-03-18"],
        ["2022-03-16", "2022-03-17"],
        ["2022-03-15", "2022-03-16"],
        ["2022-03-13", "2022-03-17"],
        ["2022-03-14", "2022-03-15"],
      ],
      3: [["2022-03-14", "2022-03-17"]],
      4: [["2022-03-15", "2022-03-17"]],
    };
    const fitResult = assignEventToRow(
      { startDate: "2022-03-14", endDate: "2022-03-15" },
      rows
    );
    expect(fitResult.fits).toBe(false);
    // expect(fitResult.rowNum).toBe(6);
  });
});
describe("getAllDayRowData", () => {
  it("doesnt create unnecessary rows: no events", () => {
    const rowData = getAllDayRowData([]);
    expect(rowData.rowCount).toBe(0);
  });
  it("doesnt create unnecessary rows: 2 events", () => {
    const rowData = getAllDayRowData([
      { startDate: "2012-07-07", endDate: "2012-12-31" },
      { startDate: "2012-12-12", endDate: "2013-06-09" },
    ]);
    expect(rowData.rowCount).toBe(2);
    expect(assignsRowNumberToEachEvent(rowData.allDayEvents)).toBe(true);
  });

  it("creates 10 rows for 10 multi-week events", () => {
    const longEvent = { startDate: "2023-02-28", endDate: "2023-06-06" };
    const events = new Array(10).fill(longEvent);

    const rowData = getAllDayRowData(events);

    expect(rowData.rowCount).toBe(10);
    expect(Object.keys(rowData.allDayEvents)).toHaveLength(10);
    expect(assignsRowNumberToEachEvent(rowData.allDayEvents)).toBe(true);
  });
  test("March 13 - 19", () => {
    const rowData = getAllDayRowData(mar13To19);
    expect(assignsRowNumberToEachEvent(rowData.allDayEvents)).toBe(true);
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
