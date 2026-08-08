import {
  clearAccountReconnectRequired,
  clearAllGoogleReconnectRequired,
  getGoogleReconnectRequiredAccountEmails,
  hasGoogleReconnectRequired,
  isAccountReconnectRequired,
  isConnectionReconnectRequired,
  markAccountReconnectRequired,
  resetGoogleReconnectRequiredForTests,
  syncReconnectRequiredFromConnections,
} from "./google.reconnect.state";
import { afterEach, describe, expect, it } from "bun:test";

afterEach(() => {
  resetGoogleReconnectRequiredForTests();
});

describe("google.reconnect.state", () => {
  it("marks and queries reconnect-required by connection id and email", () => {
    markAccountReconnectRequired({
      connectionId: "conn-1",
      accountEmail: "Lance@Example.com",
    });

    expect(isConnectionReconnectRequired("conn-1")).toBe(true);
    expect(isAccountReconnectRequired("lance@example.com")).toBe(true);
    expect(hasGoogleReconnectRequired()).toBe(true);
    expect([...getGoogleReconnectRequiredAccountEmails()]).toEqual([
      "lance@example.com",
    ]);
  });

  it("adds RECONNECT_REQUIRED rows and drops overrides only when the account disappears", () => {
    markAccountReconnectRequired({
      connectionId: "stale",
      accountEmail: "gone@example.com",
    });
    markAccountReconnectRequired({
      connectionId: "lagging",
      accountEmail: "lag@example.com",
    });

    syncReconnectRequiredFromConnections([
      {
        id: "healthy",
        accountEmail: "ok@example.com",
        connectionState: "HEALTHY",
      },
      {
        id: "lagging",
        accountEmail: "lag@example.com",
        // Still healthy in metadata after a 410 — must not clear the override.
        connectionState: "HEALTHY",
      },
      {
        id: "broken",
        accountEmail: "bad@example.com",
        connectionState: "RECONNECT_REQUIRED",
      },
    ]);

    expect(isConnectionReconnectRequired("stale")).toBe(false);
    expect(isAccountReconnectRequired("gone@example.com")).toBe(false);
    expect(isConnectionReconnectRequired("lagging")).toBe(true);
    expect(isAccountReconnectRequired("lag@example.com")).toBe(true);
    expect(isConnectionReconnectRequired("broken")).toBe(true);
    expect(isAccountReconnectRequired("bad@example.com")).toBe(true);
    expect(isConnectionReconnectRequired("healthy")).toBe(false);
  });

  it("clearAccountReconnectRequired and clearAll remove overrides", () => {
    markAccountReconnectRequired({
      connectionId: "conn-1",
      accountEmail: "a@example.com",
    });
    clearAccountReconnectRequired({
      connectionId: "conn-1",
      accountEmail: "a@example.com",
    });
    expect(hasGoogleReconnectRequired()).toBe(false);

    markAccountReconnectRequired({
      connectionId: "conn-2",
      accountEmail: "b@example.com",
    });
    clearAllGoogleReconnectRequired();
    expect(hasGoogleReconnectRequired()).toBe(false);
  });
});
