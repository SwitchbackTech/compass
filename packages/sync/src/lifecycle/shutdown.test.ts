import { ShutdownCoordinator } from "@sync/lifecycle/shutdown";

describe("ShutdownCoordinator", () => {
  it("runs tasks in reverse registration order", async () => {
    const order: string[] = [];
    const coordinator = new ShutdownCoordinator();
    coordinator.register("storage", () => {
      order.push("storage");
    });
    coordinator.register("workers", () => {
      order.push("workers");
    });
    coordinator.register("http", () => {
      order.push("http");
    });

    await coordinator.shutdown();

    // Last registered (http) drains first, storage (registered first) last.
    expect(order).toEqual(["http", "workers", "storage"]);
  });

  it("awaits async tasks", async () => {
    const order: string[] = [];
    const coordinator = new ShutdownCoordinator();
    coordinator.register("slow", async () => {
      await Promise.resolve();
      order.push("slow");
    });
    coordinator.register("fast", () => {
      order.push("fast");
    });

    await coordinator.shutdown();
    expect(order).toEqual(["fast", "slow"]);
  });

  it("runs every task even when one throws, and collects the failures", async () => {
    const order: string[] = [];
    const coordinator = new ShutdownCoordinator();
    coordinator.register("storage", () => {
      order.push("storage");
    });
    coordinator.register("broken", () => {
      throw new Error("drain failed");
    });
    coordinator.register("http", () => {
      order.push("http");
    });

    const errors = await coordinator.shutdown();

    // http (last) drains, broken throws but does not strand storage (first).
    expect(order).toEqual(["http", "storage"]);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.name).toBe("broken");
  });

  it("flips isShuttingDown once shutdown begins", async () => {
    const coordinator = new ShutdownCoordinator();
    expect(coordinator.isShuttingDown).toBe(false);
    const pending = coordinator.shutdown();
    expect(coordinator.isShuttingDown).toBe(true);
    await pending;
  });
});
