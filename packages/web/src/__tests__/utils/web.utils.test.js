import dayjs from "dayjs";
import { headers } from "@web/common/utils";
import {
  getColorsByHour,
  getHourLabels,
  toUTCOffset,
} from "@web/common/utils/web.date.util";
import { arraysAreEqual } from "@web/__tests__/utils/test.util";

const getColorTotals = (colors) => {
  const uniqueColors = Array.from(new Set(colors));

  const color1 = colors.filter((c) => c === uniqueColors[0]);
  const color2 = colors.filter((c) => c === uniqueColors[1]);
  const colorTotals = [color1.length, color2.length];
  return colorTotals;
};

describe("headers", () => {
  it("uses Bearer token", () => {
    const emptyCall = headers();
    const callWithToken = headers("aToken");

    expect(emptyCall.headers.Authorization).toContain("Bearer ");
    expect(callWithToken.headers.Authorization).toContain("Bearer ");
    expect(callWithToken.headers.Authorization).toContain("aToken");
  });
});

describe("getHourLabels", () => {
  it("has 23 intervals)", () => {
    // 23 to prevent duplicates from 11pm-midnight
    const dayTimes = getHourLabels();
    expect(dayTimes).toHaveLength(23);
  });
});

describe("getColorsByHour", () => {
  it("has 24 intervals", () => {
    const colors = getColorsByHour(dayjs().hour());
    expect(colors).toHaveLength(24);
  });

  it("uses two colors", () => {
    const colors = getColorsByHour(20);
    expect(new Set(colors).size).toBe(2);
  });

  it("only higlights one hour (noon)", () => {
    const colors = getColorsByHour(12);
    const colorTotals = getColorTotals(colors);
    expect(colorTotals).toContain(23);
    expect(colorTotals).toContain(1);
  });

  it("doesn't highlight any when midnight hour", () => {
    const colors = getColorsByHour(0);
    const colorTotals = getColorTotals(colors);
    expect(colorTotals).toEqual([24, 0]);
  });

  it("returns same order for minute 0 to 59", () => {
    const day1 = dayjs("2022-04-04T00:00:00.000Z");
    const day2 = dayjs("2022-04-04T00:59:00.000Z");
    const day1Colors = getColorsByHour(day1);
    const day2Colors = getColorsByHour(day2);

    const sameOrder = arraysAreEqual(day1Colors, day2Colors);
    expect(sameOrder).toBe(true);
  });

  it("changes at the top of the hour", () => {
    const day1 = dayjs("2022-04-04T23:59:59.000Z").hour();
    const day2 = dayjs("2022-04-05T00:00:00.000Z").hour();
    const day1Colors = getColorsByHour(day1);
    const day2Colors = getColorsByHour(day2);

    const sameOrder = arraysAreEqual(day1Colors, day2Colors);
    expect(sameOrder).toBe(false);
  });
});

describe("toUTCOffset", () => {
  const validateResult = (result) => {
    const offsetChar = result.slice(-6, -5);
    const hasOffsetChar = offsetChar === "+" || offsetChar === "-";
    expect(hasOffsetChar).toBe(true);

    // Z is used for pure UTC timestamps (which don't use an offset)
    expect(result.slice(-1)).not.toEqual("Z");
  };
  it("includes a TZ offset - when passing str with times", () => {
    const result = toUTCOffset("2022-01-01 10:00");
    validateResult(result);
  });
  it("includes a TZ offset - when passing string YYYY-MM (no times) ", () => {
    const result = toUTCOffset("2022-05-21");
    validateResult(result);
  });

  it("includes a TZ offset - when passing Date object", () => {
    const result = toUTCOffset(new Date());
    validateResult(result);
  });

  it("includes a TZ offset - when passing a dayjs object", () => {
    const d = dayjs();
    const resultFromDayJsObj = toUTCOffset(d);
    validateResult(resultFromDayJsObj);
  });
});
