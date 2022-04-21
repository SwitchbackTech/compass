import dayjs from "dayjs";
import { headers } from "@web/common/utils";
import {
  getHourlyTimes,
  getHourlyTimesDynamic,
  toUTCOffset,
} from "@web/common/utils/date.utils";

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
  it("has 23 intervals)", () => {
    // not 24 to prevent duplicates from 11pm-midnight
    const dayTimes = getHourlyTimes(dayjs());
    expect(dayTimes).toHaveLength(23);
  });
});

describe("getHourlyTimesDynamic", () => {
  it("idk", () => {
    const f = getHourlyTimesDynamic(dayjs());
    const fm = "";
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
