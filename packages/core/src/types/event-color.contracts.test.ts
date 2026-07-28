import { withColor, withColorHex } from "@core/types/event-color.contracts";
import { describe, expect, it } from "bun:test";

describe("withColor", () => {
  it("includes a slot or null and omits when undefined", () => {
    expect({ title: "x", ...withColor("blue") }).toEqual({
      title: "x",
      color: "blue",
    });
    expect({ title: "x", ...withColor(null) }).toEqual({
      title: "x",
      color: null,
    });
    expect({ title: "x", ...withColor(undefined) }).toEqual({ title: "x" });
  });
});

describe("withColorHex", () => {
  it("includes the hex and omits when undefined", () => {
    expect({ title: "x", ...withColorHex("#009688") }).toEqual({
      title: "x",
      colorHex: "#009688",
    });
    expect({ title: "x", ...withColorHex(undefined) }).toEqual({
      title: "x",
    });
  });
});
