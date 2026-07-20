import { ReadinessRegistry } from "@sync/lifecycle/readiness";

describe("ReadinessRegistry", () => {
  it("reports not ready when no checks are registered (readiness must be earned)", async () => {
    const registry = new ReadinessRegistry();
    const report = await registry.report();
    expect(report.ready).toBe(false);
    expect(report.checks).toEqual([]);
  });

  it("reports ready when the only check passes", async () => {
    const registry = new ReadinessRegistry();
    registry.register("storage", () => true);
    const report = await registry.report();
    expect(report.ready).toBe(true);
    expect(report.checks).toEqual([{ name: "storage", ready: true }]);
  });

  it("reports ready only when every check passes", async () => {
    const registry = new ReadinessRegistry();
    registry.register("storage", () => true);
    registry.register("indexes", () => true);
    registry.register("scheduler", () => false);
    const report = await registry.report();
    expect(report.ready).toBe(false);
    expect(report.checks.find((c) => c.name === "scheduler")?.ready).toBe(
      false,
    );
  });

  it("awaits async checks", async () => {
    const registry = new ReadinessRegistry();
    registry.register("storage", async () => true);
    const report = await registry.report();
    expect(report.ready).toBe(true);
  });

  it("treats a throwing check as not ready and captures the message", async () => {
    const registry = new ReadinessRegistry();
    registry.register("storage", () => {
      throw new Error("mongo unreachable");
    });
    const report = await registry.report();
    expect(report.ready).toBe(false);
    expect(report.checks[0]?.detail).toBe("mongo unreachable");
  });

  it("treats a rejected async check as not ready", async () => {
    const registry = new ReadinessRegistry();
    registry.register("storage", async () => {
      throw new Error("timed out");
    });
    const report = await registry.report();
    expect(report.ready).toBe(false);
    expect(report.checks[0]?.detail).toBe("timed out");
  });

  it("rejects a duplicate check name", () => {
    const registry = new ReadinessRegistry();
    registry.register("storage", () => true);
    expect(() => registry.register("storage", () => true)).toThrow(
      /already registered/,
    );
  });
});
