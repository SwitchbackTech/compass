import { headers } from "@web/common/helpers";

test("headers always return Bearer token", () => {
  const emptyCall = headers();
  const callWithToken = headers("aToken");

  expect(emptyCall.headers.Authorization).toContain("Bearer ");
  expect(callWithToken.headers.Authorization).toContain("Bearer ");
  expect(callWithToken.headers.Authorization).toContain("aToken");
});
