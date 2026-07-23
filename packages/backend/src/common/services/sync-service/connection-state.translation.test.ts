import {
  type ConnectionState,
  type ConnectionStateReason,
  type ProviderConnection,
} from "@core/types/sync/connection.contracts";
import { toGoogleConnectionState } from "./connection-state.translation";
import { describe, expect, it } from "bun:test";

// A ProviderConnection is a rich record, but the translation reads only state +
// stateReason; the rest is filled with valid-enough placeholders. Built as the
// plain type (not schema-parsed) so a test can pose any state/reason pair,
// including combinations the schema's refinements would reject.
const connection = (
  state: ConnectionState,
  stateReason: ConnectionStateReason | null = null,
): ProviderConnection =>
  ({
    id: "c1",
    tenantId: "t1",
    principalId: "p1",
    provider: "google",
    account: { providerAccountId: "a1", email: null, displayName: null },
    capabilities: [],
    state,
    stateReason,
    lastSyncedAt: null,
    lastHealthyAt: null,
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  }) as unknown as ProviderConnection;

describe("toGoogleConnectionState", () => {
  it("reports NOT_CONNECTED when there are no connections", () => {
    expect(toGoogleConnectionState([])).toBe("NOT_CONNECTED");
  });

  it("maps healthy to HEALTHY", () => {
    expect(toGoogleConnectionState([connection("healthy")])).toBe("HEALTHY");
  });

  it("maps every in-progress state to IMPORTING", () => {
    for (const state of ["connecting", "importing", "catchingUp"] as const) {
      expect(toGoogleConnectionState([connection(state)])).toBe("IMPORTING");
    }
  });

  it("maps delayed to ATTENTION", () => {
    expect(
      toGoogleConnectionState([connection("delayed", "workOverdue")]),
    ).toBe("ATTENTION");
  });

  it("maps a disconnected connection to RECONNECT_REQUIRED, not NOT_CONNECTED", () => {
    expect(toGoogleConnectionState([connection("disconnected")])).toBe(
      "RECONNECT_REQUIRED",
    );
  });

  it("maps actionRequired with a re-auth reason to RECONNECT_REQUIRED", () => {
    for (const reason of [
      "authorizationRevoked",
      "authorizationExpired",
      "insufficientScopes",
    ] as const) {
      expect(
        toGoogleConnectionState([connection("actionRequired", reason)]),
      ).toBe("RECONNECT_REQUIRED");
    }
  });

  it("maps actionRequired with a non-re-auth reason to ATTENTION", () => {
    for (const reason of [
      "permanentConflict",
      "providerErrors",
      "workOverdue",
    ] as const) {
      expect(
        toGoogleConnectionState([connection("actionRequired", reason)]),
      ).toBe("ATTENTION");
    }
  });

  describe("precedence across multiple connections", () => {
    it("surfaces RECONNECT_REQUIRED over a healthy sibling", () => {
      expect(
        toGoogleConnectionState([
          connection("healthy"),
          connection("actionRequired", "authorizationRevoked"),
        ]),
      ).toBe("RECONNECT_REQUIRED");
    });

    it("surfaces ATTENTION over IMPORTING and HEALTHY", () => {
      expect(
        toGoogleConnectionState([
          connection("healthy"),
          connection("importing"),
          connection("delayed", "providerErrors"),
        ]),
      ).toBe("ATTENTION");
    });

    it("surfaces IMPORTING over a healthy sibling", () => {
      expect(
        toGoogleConnectionState([
          connection("healthy"),
          connection("importing"),
        ]),
      ).toBe("IMPORTING");
    });

    it("reports HEALTHY only when every connection is healthy", () => {
      expect(
        toGoogleConnectionState([connection("healthy"), connection("healthy")]),
      ).toBe("HEALTHY");
    });
  });
});
