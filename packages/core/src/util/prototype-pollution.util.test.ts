import { stripPrototypePollutingKeys } from "./prototype-pollution.util";
import { describe, expect, it } from "bun:test";

describe("stripPrototypePollutingKeys", () => {
  it("drops prototype-polluting keys parsed from untrusted JSON", () => {
    const payload = JSON.parse(
      '{"safe":1,"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}',
    ) as Record<string, unknown>;

    const sanitized = stripPrototypePollutingKeys(payload);

    expect(Object.getOwnPropertyNames(sanitized)).toEqual(["safe"]);
    expect(sanitized).toEqual({ safe: 1 });
  });

  it("drops polluting keys nested in objects and arrays", () => {
    const payload = JSON.parse(
      '{"a":{"b":{"__proto__":{"polluted":true},"keep":"yes"}},"list":[{"prototype":1,"keep":2}]}',
    ) as Record<string, unknown>;

    const sanitized = stripPrototypePollutingKeys(payload) as {
      a: { b: Record<string, unknown> };
      list: Record<string, unknown>[];
    };

    expect(Object.getOwnPropertyNames(sanitized.a.b)).toEqual(["keep"]);
    expect(sanitized).toEqual({
      a: { b: { keep: "yes" } },
      list: [{ keep: 2 }],
    });
  });

  it("keeps every other value intact and leaves the input untouched", () => {
    const date = new Date("2026-01-01T00:00:00.000Z");
    const payload = {
      nested: { count: 0, flag: false, missing: null },
      list: [1, "two", null],
      date,
    };

    const sanitized = stripPrototypePollutingKeys(payload);

    expect(sanitized).toEqual(payload);
    expect(sanitized).not.toBe(payload);
    expect(sanitized.date).toBe(date);
  });
});
