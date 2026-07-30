import {
  type ConnectionState,
  type ConnectionStateReason,
} from "@core/types/sync/connection.contracts";

// The single source of truth for a connection's user-facing state. It is a PURE
// function of persisted evidence — no repository or adapter may set "healthy"
// (or any state) directly. Health is earned: valid authority, no overdue
// required work, and a recently verified path.

// Work overdue by at least this long stops a connection from looking healthy.
export const DELAYED_THRESHOLD_MS = 2 * 60 * 1000;

export type CredentialState =
  | "valid"
  | "revoked"
  | "expired"
  | "insufficientScopes";

export interface ConnectionStateEvidence {
  // The user ended this connection; nothing else matters.
  readonly disconnectedAt: Date | null;
  readonly credential: CredentialState;
  // A permanent conflict the user must resolve (e.g. an unsafe version clash).
  readonly permanentConflict: boolean;
  // At least one ACTIVE calendar's reads are durably rejected by the provider
  // (see the readFailed settlement in sync-job-dispatch). Its job was settled
  // rather than left retrying, so no overdue-work signal remains to notice —
  // without this, a connection whose primary calendar had been dead for days
  // still reported healthy, every other signal green (2026-07-30).
  readonly durableReadFailure: boolean;
  // The provider account identity has been resolved.
  readonly accountIdentified: boolean;
  // The first complete in-horizon import has finished.
  readonly initialImportComplete: boolean;
  // A non-destructive repair or post-gap reconciliation is running while
  // existing data stays queryable.
  readonly catchingUp: boolean;
  // The oldest piece of due-but-incomplete work, or null when none is overdue.
  readonly oldestDueWorkAt: Date | null;
  // Recent provider errors are the cause of overdue work (vs. plain backlog).
  readonly recentProviderErrors: boolean;
}

export interface DerivedConnectionState {
  readonly state: ConnectionState;
  // Present only for delayed and actionRequired; null otherwise.
  readonly reason: ConnectionStateReason | null;
}

const CREDENTIAL_REASON: Record<
  Exclude<CredentialState, "valid">,
  ConnectionStateReason
> = {
  revoked: "authorizationRevoked",
  expired: "authorizationExpired",
  insufficientScopes: "insufficientScopes",
};

// Priority order matters: earlier conditions dominate later ones. A revoked
// credential is action-required even mid-import; a disconnected connection is
// disconnected regardless of anything else.
export function deriveConnectionState(
  evidence: ConnectionStateEvidence,
  now: Date,
): DerivedConnectionState {
  if (evidence.disconnectedAt) {
    return { state: "disconnected", reason: null };
  }

  if (evidence.credential !== "valid") {
    return {
      state: "actionRequired",
      reason: CREDENTIAL_REASON[evidence.credential],
    };
  }

  if (evidence.permanentConflict) {
    return { state: "actionRequired", reason: "permanentConflict" };
  }

  // Ranked above connecting/importing deliberately: a calendar the provider
  // durably refuses to read never earns a cursor, so the import-complete test
  // below can never pass and the connection would otherwise sit on "importing"
  // forever. Delayed/providerErrors says the true thing in both cases — the
  // never-imported one and the imported-then-broken one.
  if (evidence.durableReadFailure) {
    return { state: "delayed", reason: "providerErrors" };
  }

  if (!evidence.accountIdentified) {
    return { state: "connecting", reason: null };
  }

  if (!evidence.initialImportComplete) {
    return { state: "importing", reason: null };
  }

  if (evidence.catchingUp) {
    return { state: "catchingUp", reason: null };
  }

  if (isOverdue(evidence.oldestDueWorkAt, now)) {
    return {
      state: "delayed",
      reason: evidence.recentProviderErrors ? "providerErrors" : "workOverdue",
    };
  }

  return { state: "healthy", reason: null };
}

function isOverdue(oldestDueWorkAt: Date | null, now: Date): boolean {
  if (!oldestDueWorkAt) return false;
  return now.getTime() - oldestDueWorkAt.getTime() >= DELAYED_THRESHOLD_MS;
}
