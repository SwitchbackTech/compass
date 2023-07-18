import { yearsAgo } from "../common/helpers/common.util";

test("yearsAgo is a Date object", () => {
  const twoYrs = yearsAgo(2);
  expect(() => twoYrs.toISOString()).not.toThrow(Error);
});
