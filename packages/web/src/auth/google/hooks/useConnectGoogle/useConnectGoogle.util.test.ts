import { getGoogleAccountSummaryStatus } from "./useConnectGoogle.util";
import { describe, expect, it } from "bun:test";

describe("getGoogleAccountSummaryStatus", () => {
  it("returns no account summary status when Google is not connected", () => {
    expect(getGoogleAccountSummaryStatus("NOT_CONNECTED")).toBeNull();
  });

  it("returns healthy copy for connected Google", () => {
    expect(getGoogleAccountSummaryStatus("HEALTHY")).toEqual({
      isHealthy: true,
      isLoading: false,
      label: "Synced with Google",
    });
  });

  it.each([
    "IMPORTING",
    "repairing",
  ] as const)("returns syncing copy for %s", (state) => {
    expect(getGoogleAccountSummaryStatus(state)).toEqual({
      isHealthy: false,
      isLoading: false,
      label: "Syncing...",
    });
  });

  it("marks checking as loading", () => {
    expect(getGoogleAccountSummaryStatus("checking")).toEqual({
      isHealthy: false,
      isLoading: true,
      label: "Syncing...",
    });
  });

  it("separates reconnect and repair copy", () => {
    expect(getGoogleAccountSummaryStatus("RECONNECT_REQUIRED")?.label).toBe(
      "Reconnect needed",
    );
    expect(getGoogleAccountSummaryStatus("ATTENTION")?.label).toBe(
      "Repair needed",
    );
  });
});
