import { headers, convertTimeZones } from "@web/common/helpers";
// import { convertTimeZones } from './index';

describe("timezone stuff", () => {
  it("works idk temp change", () => {
    const orig = "2022-02-01T11:15:00-06:00";
    const updated = convertTimeZones(orig, "America/Los_Angeles");
    const y = 1;
  });
});

describe("headers", () => {
  it("uses Bearer token", () => {
    const emptyCall = headers();
    const callWithToken = headers("aToken");

    expect(emptyCall.headers.Authorization).toContain("Bearer ");
    expect(callWithToken.headers.Authorization).toContain("Bearer ");
    expect(callWithToken.headers.Authorization).toContain("aToken");
  });
});
