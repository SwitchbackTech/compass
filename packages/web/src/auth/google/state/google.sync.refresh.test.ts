import { createGoogleSyncRefreshCoordinator } from "@web/auth/google/state/google.sync.refresh";
import { describe, expect, it, mock } from "bun:test";

describe("createGoogleSyncRefreshCoordinator", () => {
  it("shares one in-flight refresh across callers", async () => {
    let resolveRequest: (() => void) | undefined;
    const request = mock(
      () =>
        new Promise<void>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const coordinator = createGoogleSyncRefreshCoordinator(request);

    const first = coordinator.refresh();
    const second = coordinator.refresh();

    expect(second).toBe(first);
    expect(request).toHaveBeenCalledTimes(1);
    expect(coordinator.getIsRefreshing()).toBe(true);

    resolveRequest?.();
    await first;

    expect(coordinator.getIsRefreshing()).toBe(false);
  });
});
