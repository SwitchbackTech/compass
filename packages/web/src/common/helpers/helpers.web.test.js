import { headers } from "@web/common/helpers";
import { toUTCOffset } from "@web/common/helpers/date.helpers";

describe("headers", () => {
  it("uses Bearer token", () => {
    const emptyCall = headers();
    const callWithToken = headers("aToken");

    expect(emptyCall.headers.Authorization).toContain("Bearer ");
    expect(callWithToken.headers.Authorization).toContain("Bearer ");
    expect(callWithToken.headers.Authorization).toContain("aToken");
  });
});

describe("toUTCOffset", () => {
  it("includes a TZ offset", () => {
    const dateStr = toUTCOffset("2022-01-01 10:00");
    console.log(`dateStr: ${dateStr}`);

    const offsetChar = dateStr.slice(-6, -5);
    const hasOffsetChar = offsetChar === "+" || offsetChar === "-";
    expect(hasOffsetChar).toBe(true);

    // Z is used for pure UTC timestamps (which don't use an offset)
    expect(dateStr.slice(-1)).not.toEqual("Z");
  });
});
