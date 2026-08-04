import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { type GoogleSyncConnectionSummary } from "@core/types/user.types";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { AuthApi } from "@web/api/auth.api";
import { userMetadataActions } from "@web/auth/state/user-metadata.store";
import { useConnectGoogle } from "./useConnectGoogle";
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";

// Reconnecting one of several accounts must rebind consent to THAT account's
// connection, and report that account's own state - not the precedence-winning
// one the top-level banner shows.

const connection = (
  overrides: Partial<GoogleSyncConnectionSummary>,
): GoogleSyncConnectionSummary => ({
  id: "connection-primary",
  state: "actionRequired",
  stateReason: "authorizationRevoked",
  lastSyncedAt: null,
  lastHealthyAt: null,
  accountEmail: "primary@example.com",
  connectionState: "RECONNECT_REQUIRED",
  ...overrides,
});

const renderScoped = (scoped?: GoogleSyncConnectionSummary) => {
  const { wrapper } = createStoreWrapper();
  return renderHook(
    () => useConnectGoogle(scoped ? { connection: scoped } : undefined),
    { wrapper },
  );
};

describe("useConnectGoogle account scoping", () => {
  beforeEach(() => {
    userMetadataActions.set({
      google: {
        connectionState: "RECONNECT_REQUIRED",
        connection: connection({}),
        connections: [
          connection({}),
          connection({
            id: "connection-healthy",
            state: "healthy",
            stateReason: null,
            accountEmail: "second@example.com",
            connectionState: "HEALTHY",
          }),
        ],
      },
    });
  });

  afterEach(() => {
    cleanup();
    userMetadataActions.clear();
  });

  it("reports the scoped account's own state, not the aggregate", () => {
    const healthy = connection({
      id: "connection-healthy",
      state: "healthy",
      stateReason: null,
      accountEmail: "second@example.com",
      connectionState: "HEALTHY",
    });

    // The aggregate is RECONNECT_REQUIRED because the other account is broken.
    expect(renderScoped().result.current.state).toBe("RECONNECT_REQUIRED");
    expect(renderScoped(healthy).result.current.state).toBe("HEALTHY");
  });

  it("binds reconnect to the scoped account's connection id", async () => {
    const broken = connection({
      id: "connection-second",
      accountEmail: "second@example.com",
    });
    const beginSpy = spyOn(AuthApi, "beginGoogleConnection").mockResolvedValue({
      // A hash target: the hook navigates to whatever URL it gets back, and
      // jsdom implements only hash navigation (a real URL logs a noisy
      // "Not implemented: navigation" error). The assertion is on the request,
      // not the redirect.
      authorizationUrl: "#consent",
    });

    const { result } = renderScoped(broken);
    act(() => result.current.connect());

    await waitFor(() => {
      expect(beginSpy).toHaveBeenCalledWith({
        connectionId: "connection-second",
      });
    });

    beginSpy.mockRestore();
  });

  it("falls back to the precedence-winning connection when unscoped", async () => {
    const beginSpy = spyOn(AuthApi, "beginGoogleConnection").mockResolvedValue({
      // A hash target: the hook navigates to whatever URL it gets back, and
      // jsdom implements only hash navigation (a real URL logs a noisy
      // "Not implemented: navigation" error). The assertion is on the request,
      // not the redirect.
      authorizationUrl: "#consent",
    });

    const { result } = renderScoped();
    act(() => result.current.connect());

    await waitFor(() => {
      expect(beginSpy).toHaveBeenCalledWith({
        connectionId: "connection-primary",
      });
    });

    beginSpy.mockRestore();
  });
});
