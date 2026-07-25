import {
  isUnhealthyConnectionAlert,
  unhealthyConnectionPercent,
} from "@sync/telemetry/health-alert";
import { describe, expect, it } from "bun:test";

const counts = (overrides: {
  healthy?: number;
  delayed?: number;
  actionRequired?: number;
  disconnected?: number;
}) => ({
  connecting: 0,
  importing: 0,
  catchingUp: 0,
  healthy: overrides.healthy ?? 100,
  delayed: overrides.delayed ?? 0,
  actionRequired: overrides.actionRequired ?? 0,
  disconnected: overrides.disconnected ?? 0,
});

describe("unhealthy connection alert", () => {
  it("computes percent from delayed + actionRequired", () => {
    expect(
      unhealthyConnectionPercent(counts({ healthy: 98, delayed: 2 })),
    ).toBeCloseTo(2);
    expect(unhealthyConnectionPercent(counts({}))).toBe(0);
  });

  it("fires only after two consecutive windows above 1%", () => {
    const ok = counts({ delayed: 0 });
    const bad = counts({ healthy: 98, delayed: 2 });
    expect(isUnhealthyConnectionAlert([bad])).toBe(false);
    expect(isUnhealthyConnectionAlert([ok, bad])).toBe(false);
    expect(isUnhealthyConnectionAlert([bad, bad])).toBe(true);
    expect(isUnhealthyConnectionAlert([bad, ok, bad])).toBe(false);
  });
});
