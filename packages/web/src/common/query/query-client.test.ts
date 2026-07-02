import { createCompassQueryClient } from "./query-client";
import { describe, expect, test } from "bun:test";

describe("createCompassQueryClient", () => {
  test("disables retries and treats completed queries as stale", () => {
    const client = createCompassQueryClient();
    const defaults = client.getDefaultOptions();

    expect(defaults.queries?.retry).toBe(false);
    expect(defaults.queries?.staleTime).toBe(0);
    expect(defaults.mutations?.retry).toBe(false);
  });

  test("creates isolated query caches", () => {
    const first = createCompassQueryClient();
    const second = createCompassQueryClient();

    first.setQueryData(["probe"], "first");

    expect(first.getQueryData<string>(["probe"])).toBe("first");
    expect(second.getQueryData(["probe"])).toBeUndefined();
  });
});
