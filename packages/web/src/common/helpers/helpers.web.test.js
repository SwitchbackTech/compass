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
    const hasDashAtEnd = dateStr.slice(-6, -5) === "-";
    expect(hasDashAtEnd).toBe(true);
  });
});
