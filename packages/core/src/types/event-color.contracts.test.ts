import { withColor } from "@core/types/event-color.contracts";
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
