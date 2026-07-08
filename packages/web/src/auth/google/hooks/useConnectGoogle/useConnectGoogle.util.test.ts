import { getGoogleAccountSummaryStatus } from "./useConnectGoogle.util";
import { describe, expect, it, mock } from "bun:test";

describe("getGoogleAccountSummaryStatus", () => {
  const onRepairGoogle = mock();
  const onOpenGoogleAuth = mock();
  const callbacks = { onRepairGoogle, onOpenGoogleAuth };

  it("returns no account summary status when Google is not connected", () => {
    expect(
      getGoogleAccountSummaryStatus("NOT_CONNECTED", callbacks),
    ).toBeNull();
  });

  it("returns healthy copy for connected Google", () => {
    expect(getGoogleAccountSummaryStatus("HEALTHY", callbacks)).toEqual({
      variant: "healthy",
      tooltip: "Up-to-date",
    });
  });

  it.each([
    "IMPORTING",
    "repairing",
    "checking",
  ] as const)("returns syncing copy for %s", (state) => {
    expect(getGoogleAccountSummaryStatus(state, callbacks)).toEqual({
      variant: "syncing",
      tooltip: "Syncing...",
    });
  });

  it("wires ATTENTION to the sync action, without using the word 'repair'", () => {
    const status = getGoogleAccountSummaryStatus("ATTENTION", callbacks);

    expect(status?.variant).toBe("warning");
    expect(status?.tooltip.toLowerCase()).not.toContain("repair");
    expect(status?.action?.label).toBe("Sync now");

    status?.action?.onClick();
    expect(onRepairGoogle).toHaveBeenCalledTimes(1);
  });

  it("wires RECONNECT_REQUIRED to the reconnect action", () => {
    const status = getGoogleAccountSummaryStatus(
      "RECONNECT_REQUIRED",
      callbacks,
    );

    expect(status?.variant).toBe("error");
    expect(status?.action?.label).toBe("Reconnect");

    status?.action?.onClick();
    expect(onOpenGoogleAuth).toHaveBeenCalledTimes(1);
  });
});
