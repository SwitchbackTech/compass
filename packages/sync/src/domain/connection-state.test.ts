import {
  type ConnectionStateEvidence,
  DELAYED_THRESHOLD_MS,
  deriveConnectionState,
} from "@sync/domain/connection-state";

const NOW = new Date("2026-07-20T12:00:00.000Z");
const agoMs = (ms: number) => new Date(NOW.getTime() - ms);

// A fully healthy connection; each test overrides the one axis it exercises.
const healthy = (
  overrides: Partial<ConnectionStateEvidence> = {},
): ConnectionStateEvidence => ({
  disconnectedAt: null,
  credential: "valid",
  permanentConflict: false,
  accountIdentified: true,
  initialImportComplete: true,
  catchingUp: false,
  oldestDueWorkAt: null,
  recentProviderErrors: false,
  ...overrides,
});

const derive = (overrides: Partial<ConnectionStateEvidence> = {}) =>
  deriveConnectionState(healthy(overrides), NOW);

describe("deriveConnectionState", () => {
  it("is healthy with valid authority, no catch-up, and no overdue work", () => {
    expect(derive()).toEqual({ state: "healthy", reason: null });
  });

  it("is disconnected when the user ended the connection", () => {
    expect(derive({ disconnectedAt: agoMs(1000) })).toEqual({
      state: "disconnected",
      reason: null,
    });
  });

  it.each([
    ["revoked", "authorizationRevoked"],
    ["expired", "authorizationExpired"],
    ["insufficientScopes", "insufficientScopes"],
  ] as const)("is actionRequired for a %s credential", (credential, reason) => {
    expect(derive({ credential })).toEqual({ state: "actionRequired", reason });
  });

  it("is actionRequired for a permanent conflict", () => {
    expect(derive({ permanentConflict: true })).toEqual({
      state: "actionRequired",
      reason: "permanentConflict",
    });
  });

  it("is connecting before the provider account is identified", () => {
    expect(derive({ accountIdentified: false })).toEqual({
      state: "connecting",
      reason: null,
    });
  });

  it("is importing until the first in-horizon import completes", () => {
    expect(derive({ initialImportComplete: false })).toEqual({
      state: "importing",
      reason: null,
    });
  });

  it("is catchingUp while a repair or reconciliation runs", () => {
    expect(derive({ catchingUp: true })).toEqual({
      state: "catchingUp",
      reason: null,
    });
  });

  it("is delayed when work is overdue by the threshold (workOverdue)", () => {
    expect(derive({ oldestDueWorkAt: agoMs(DELAYED_THRESHOLD_MS) })).toEqual({
      state: "delayed",
      reason: "workOverdue",
    });
  });

  it("is delayed with providerErrors when recent provider errors caused the backlog", () => {
    expect(
      derive({
        oldestDueWorkAt: agoMs(DELAYED_THRESHOLD_MS + 5000),
        recentProviderErrors: true,
      }),
    ).toEqual({ state: "delayed", reason: "providerErrors" });
  });

  it("stays healthy when overdue work is under the threshold", () => {
    expect(
      derive({ oldestDueWorkAt: agoMs(DELAYED_THRESHOLD_MS - 1) }),
    ).toEqual({ state: "healthy", reason: null });
  });

  it("becomes delayed exactly at the threshold boundary", () => {
    const justUnder = derive({
      oldestDueWorkAt: agoMs(DELAYED_THRESHOLD_MS - 1),
    });
    const atThreshold = derive({
      oldestDueWorkAt: agoMs(DELAYED_THRESHOLD_MS),
    });
    expect(justUnder.state).toBe("healthy");
    expect(atThreshold.state).toBe("delayed");
  });

  describe("priority ordering", () => {
    it("disconnected dominates a revoked credential", () => {
      expect(
        derive({ disconnectedAt: agoMs(1000), credential: "revoked" }).state,
      ).toBe("disconnected");
    });

    it("a bad credential dominates connecting/importing/catchingUp", () => {
      expect(
        derive({
          credential: "revoked",
          accountIdentified: false,
          initialImportComplete: false,
          catchingUp: true,
        }).state,
      ).toBe("actionRequired");
    });

    it("credential is checked before a permanent conflict", () => {
      expect(
        derive({ credential: "expired", permanentConflict: true }).reason,
      ).toBe("authorizationExpired");
    });

    it("connecting dominates importing and overdue work", () => {
      expect(
        derive({
          accountIdentified: false,
          initialImportComplete: false,
          oldestDueWorkAt: agoMs(DELAYED_THRESHOLD_MS + 1000),
        }).state,
      ).toBe("connecting");
    });

    it("importing dominates overdue work (no delayed during first import)", () => {
      expect(
        derive({
          initialImportComplete: false,
          oldestDueWorkAt: agoMs(DELAYED_THRESHOLD_MS + 1000),
        }).state,
      ).toBe("importing");
    });

    it("catchingUp dominates overdue work", () => {
      expect(
        derive({
          catchingUp: true,
          oldestDueWorkAt: agoMs(DELAYED_THRESHOLD_MS + 1000),
        }).state,
      ).toBe("catchingUp");
    });
  });
});
