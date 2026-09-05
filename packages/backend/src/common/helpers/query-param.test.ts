import { parseCommaSeparatedQueryParam } from "@backend/common/helpers/query-param";
import { describe, expect, it } from "bun:test";

describe("parseCommaSeparatedQueryParam", () => {
  it("parses comma-separated values", () => {
    expect(parseCommaSeparatedQueryParam("a,b")).toEqual(["a", "b"]);
  });

  it("parses repeated values and mixed comma-separated values", () => {
    expect(parseCommaSeparatedQueryParam(["a,b", "c"])).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("leaves absent and structurally invalid values for schema validation", () => {
    expect(parseCommaSeparatedQueryParam(undefined)).toBeUndefined();
    expect(
      parseCommaSeparatedQueryParam(["a", { nested: "b" }]),
    ).toBeUndefined();
  });
});
