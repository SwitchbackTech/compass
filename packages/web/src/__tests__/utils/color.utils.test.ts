import { getNeighbourKey } from "@core/util/color.utils";
import { colors } from "@core/constants/colors";

describe("getNeighbourKey", () => {
  it("increments when index is positive", () => {
    expect(getNeighbourKey("teal_2", colors, 1)).toBe("teal_3");
  });
  it("decrements when index is negative", () => {
    expect(getNeighbourKey("teal_2", colors, -1)).toBe("teal_1");
  });
});
