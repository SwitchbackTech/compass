import { getLineClamp } from "./grid.util";

describe("getLineClamp", () => {
  it("uses a minimum value of 1", () => {
    expect(getLineClamp(-1)).toBe(1);
    expect(getLineClamp(0)).toBe(1);
    expect(getLineClamp(1)).toBe(1);
    expect(getLineClamp(1.818)).toBe(1);
  });
  it("uses value larger than 1 when possible", () => {
    expect(getLineClamp(190.88)).toBeGreaterThan(1);
  });
});
