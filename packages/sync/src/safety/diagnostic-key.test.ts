import { deriveDiagnosticKey } from "@sync/safety/diagnostic-key";
import { describe, expect, it } from "bun:test";

describe("deriveDiagnosticKey", () => {
  it("is stable for the same connection id", () => {
    const id = "507f1f77bcf86cd799439011";
    expect(deriveDiagnosticKey(id)).toBe(deriveDiagnosticKey(id));
  });

  it("differs across connection ids and is 32 hex chars", () => {
    const a = deriveDiagnosticKey("507f1f77bcf86cd799439011");
    const b = deriveDiagnosticKey("507f1f77bcf86cd799439012");
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{32}$/);
  });

  it("is not the raw connection id", () => {
    const id = "507f1f77bcf86cd799439011";
    expect(deriveDiagnosticKey(id)).not.toBe(id);
    expect(deriveDiagnosticKey(id)).not.toContain(id);
  });
});
