import dayjs from "dayjs";
import { headers } from "@web/common/helpers";
import { getHourlyTimes, toUTCOffset } from "@web/common/helpers/date.helpers";

describe("headers", () => {
  it("uses Bearer token", () => {
    const emptyCall = headers();
    const callWithToken = headers("aToken");

    expect(emptyCall.headers.Authorization).toContain("Bearer ");
    expect(callWithToken.headers.Authorization).toContain("Bearer ");
    expect(callWithToken.headers.Authorization).toContain("aToken");
  });
});

describe("getHourlyTimes", () => {
  it("has 24 intervals (1 per hour)", () => {
    const dayTimes = getHourlyTimes(dayjs());
    expect(dayTimes.length).toBe(23); // 23 cuz 0 index
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
  it("includes a TZ offset - when passing str", () => {
    const result = toUTCOffset("2022-01-01 10:00");
    validateResult(result);
  });
  it("includes a TZ offset - when passing a dayjs object", () => {
    const d = dayjs();
    const resultFromDayJsObj = toUTCOffset(d);
    validateResult(resultFromDayJsObj);
  });
});
