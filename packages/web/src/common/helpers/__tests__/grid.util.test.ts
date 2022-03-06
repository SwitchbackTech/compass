import { getPrevDayWidth, getFlexBasis } from "@web/common/helpers/grid.util";
import {
  FLEX_TODAY,
  FLEX_TMRW,
  FUTURE_MULTIPLE,
  FLEX_EQUAL,
} from "@web/common/constants/grid.constants";
import dayjs from "dayjs";

describe("getFlexBasisByDay", () => {
  test("past week: all same", () => {
    const july10 = dayjs("2022-07-10");
    const weekInFocus = 50;
    const july20Week = july10.week(july10.week());
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
    const jan1Week = jan1.week(jan1.week());
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
  const mar9Week = mar9.week(week);
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
  test("Thu [tmrw]", () => {
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
  const feb27Week = today.week(weekInFocus);
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
});
