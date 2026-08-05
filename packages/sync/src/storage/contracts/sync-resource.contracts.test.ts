import { ResourceBootstrapStateSchema } from "./sync-resource.contracts";
import { describe, expect, it } from "bun:test";

describe("ResourceBootstrapStateSchema", () => {
  it("parses every known state", () => {
    for (const state of ["importing", "watching", "catchingUp", "ready"]) {
      expect(ResourceBootstrapStateSchema.parse(state)).toBe(state);
    }
  });

  it("rejects a missing value - no default (backfill-bootstrap-state stamps every row explicitly instead)", () => {
    expect(() => ResourceBootstrapStateSchema.parse(undefined)).toThrow();
  });
});
