import {
  BACKLOG_DELAYED_THRESHOLD_MS,
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
  durableReadFailure: false,
  accountIdentified: true,
  initialImportComplete: true,
  bootstrapOverdue: false,
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

  it("is delayed with providerErrors when a calendar's reads are durably rejected", () => {
    expect(derive({ durableReadFailure: true })).toEqual({
      state: "delayed",
      reason: "providerErrors",
    });
  });

  it("is connecting before the provider account is identified", () => {
    expect(derive({ accountIdentified: false })).toEqual({
      state: "connecting",
      reason: null,
    });
  });

  it("is importing until the first sync bootstrap completes", () => {
    expect(derive({ initialImportComplete: false })).toEqual({
      state: "importing",
      reason: null,
    });
  });

  it("is delayed (workOverdue) when bootstrap has been incomplete past the overdue window, even with no overdue job", () => {
    expect(
      derive({ initialImportComplete: false, bootstrapOverdue: true }),
    ).toEqual({
      state: "delayed",
      reason: "workOverdue",
    });
  });

  it("stays importing when bootstrap is incomplete but not yet overdue", () => {
    expect(
      derive({ initialImportComplete: false, bootstrapOverdue: false }),
    ).toEqual({
      state: "importing",
      reason: null,
    });
  });

  it("bootstrapOverdue is irrelevant once bootstrap has completed", () => {
    expect(
      derive({ initialImportComplete: true, bootstrapOverdue: true }),
    ).toEqual({
      state: "healthy",
      reason: null,
    });
  });

  it("is catchingUp while a repair or reconciliation runs", () => {
    expect(derive({ catchingUp: true })).toEqual({
      state: "catchingUp",
      reason: null,
    });
  });

  it("is delayed when work is overdue by the backlog threshold (workOverdue)", () => {
    expect(
      derive({ oldestDueWorkAt: agoMs(BACKLOG_DELAYED_THRESHOLD_MS) }),
    ).toEqual({
      state: "delayed",
      reason: "workOverdue",
    });
  });

  it("stays catchingUp for plain backlog under the backlog threshold", () => {
    expect(
      derive({
        catchingUp: true,
        oldestDueWorkAt: agoMs(DELAYED_THRESHOLD_MS),
      }),
    ).toEqual({ state: "catchingUp", reason: null });
  });

  it("is delayed with providerErrors when recent provider errors caused the backlog", () => {
    expect(
      derive({
        oldestDueWorkAt: agoMs(DELAYED_THRESHOLD_MS + 5000),
        recentProviderErrors: true,
      }),
    ).toEqual({ state: "delayed", reason: "providerErrors" });
  });

  it("stays healthy when overdue work is under the backlog threshold", () => {
    expect(
      derive({ oldestDueWorkAt: agoMs(BACKLOG_DELAYED_THRESHOLD_MS - 1) }),
    ).toEqual({ state: "healthy", reason: null });
  });

  it("becomes delayed exactly at the backlog threshold boundary", () => {
    const justUnder = derive({
      oldestDueWorkAt: agoMs(BACKLOG_DELAYED_THRESHOLD_MS - 1),
    });
    const atThreshold = derive({
      oldestDueWorkAt: agoMs(BACKLOG_DELAYED_THRESHOLD_MS),
    });
    expect(justUnder.state).toBe("healthy");
    expect(atThreshold.state).toBe("delayed");
  });

  it("alarms at the short threshold when recent provider errors are present", () => {
    const justUnder = derive({
      oldestDueWorkAt: agoMs(DELAYED_THRESHOLD_MS - 1),
      recentProviderErrors: true,
    });
    const atThreshold = derive({
      oldestDueWorkAt: agoMs(DELAYED_THRESHOLD_MS),
      recentProviderErrors: true,
    });
    expect(justUnder.state).toBe("healthy");
    expect(atThreshold).toEqual({
      state: "delayed",
      reason: "providerErrors",
    });
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

    it("a durable read failure dominates importing", () => {
      // The calendar the provider refuses to read can never earn a cursor, so
      // without this precedence the connection would sit on "importing" forever
      // rather than reporting the provider problem.
      expect(
        derive({ durableReadFailure: true, initialImportComplete: false })
          .state,
      ).toBe("delayed");
    });

    it("a bad credential dominates a durable read failure", () => {
      expect(
        derive({ credential: "revoked", durableReadFailure: true }).state,
      ).toBe("actionRequired");
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

    it("surfaces overdue bootstrap work instead of importing forever", () => {
      expect(
        derive({
          initialImportComplete: false,
          oldestDueWorkAt: agoMs(BACKLOG_DELAYED_THRESHOLD_MS + 1000),
        }).state,
      ).toBe("delayed");
    });

    it("surfaces overdue catch-up work instead of syncing forever", () => {
      expect(
        derive({
          catchingUp: true,
          oldestDueWorkAt: agoMs(BACKLOG_DELAYED_THRESHOLD_MS + 1000),
        }).state,
      ).toBe("delayed");
    });
  });
});
