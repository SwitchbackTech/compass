import {
  type ConnectionState,
  type ConnectionStateReason,
  type ProviderConnection,
} from "@core/types/sync/connection.contracts";
import {
  type GoogleConnectionState,
  type GoogleSyncConnectionSummary,
} from "@core/types/user.types";

/**
 * Translate the sync service's multi-connection health model into the single
 * `GoogleConnectionState` enum the browser already reads from `/user/metadata`.
 *
 * The two implementations model connections differently — sync tracks many
 * connections each with a rich `state`/`stateReason`, while the legacy product
 * exposes one derived Google enum — so delegating status to sync means
 * translating here rather than passing a shape through. Keeping this a pure
 * function makes the mapping exhaustively testable in isolation, independent of
 * any route wiring.
 */

// actionRequired reasons that mean the user must re-authorize (re-run the
// connect flow), as opposed to waiting out a transient problem or contacting
// support. These map to RECONNECT_REQUIRED; other actionRequired reasons are
// surfaced as the softer ATTENTION.
const REAUTH_REASONS: ReadonlySet<ConnectionStateReason> = new Set([
  "authorizationRevoked",
  "authorizationExpired",
  "insufficientScopes",
]);

function translateConnection(
  state: ConnectionState,
  reason: ConnectionStateReason | null,
): GoogleConnectionState {
  switch (state) {
    case "healthy":
      return "HEALTHY";
    // Every "work in progress" state the UI shows as an importing spinner. The
    // legacy app likewise reports an active sync as IMPORTING, so catchingUp
    // (incremental backlog) is IMPORTING rather than HEALTHY.
    case "connecting":
    case "importing":
    case "catchingUp":
      return "IMPORTING";
    // A connection record exists but its credential is gone: the user must
    // reconnect. That is more actionable than NOT_CONNECTED, which the browser
    // treats as never-connected. NOTE for when this feeds the browser: today
    // `disconnected` only results from a deliberate self-serve disconnect, so a
    // user who intentionally disconnects would see a persistent "needs
    // reconnecting" status rather than a neutral connect prompt. Confirm that
    // intent before the status route ships.
    case "disconnected":
      return "RECONNECT_REQUIRED";
    // actionRequired always needs the user to act. Re-auth reasons map to
    // RECONNECT_REQUIRED; other reasons (today only permanentConflict) fall to
    // the softer ATTENTION. NOTE: ATTENTION's browser affordance is a resync,
    // which won't resolve a permanent conflict — revisit the remediation when
    // the status route is wired.
    case "actionRequired":
      return reason && REAUTH_REASONS.has(reason)
        ? "RECONNECT_REQUIRED"
        : "ATTENTION";
    case "delayed":
      return "ATTENTION";
  }
}

// When a principal has more than one Google connection, surface the most
// actionable state so a single broken account is never hidden behind a healthy
// one. A user has one Google account today; this keeps the contract honest if
// that changes.
const PRECEDENCE: readonly GoogleConnectionState[] = [
  "RECONNECT_REQUIRED",
  "ATTENTION",
  "IMPORTING",
  "HEALTHY",
];

export function toGoogleConnectionState(
  connections: readonly ProviderConnection[],
): GoogleConnectionState {
  // Google is the only provider today and this enum is Google-specific, so
  // every connection maps directly.
  if (connections.length === 0) return "NOT_CONNECTED";

  const states = connections.map((connection) =>
    translateConnection(connection.state, connection.stateReason),
  );
  for (const candidate of PRECEDENCE) {
    if (states.includes(candidate)) return candidate;
  }
  // Unreachable: translateConnection never returns NOT_CONNECTED, so a non-empty
  // list always matches a precedence value. Defensive only.
  return "NOT_CONNECTED";
}

// The connection whose translated enum matches the product precedence winner.
// Used so reconnect can target the broken account, not a healthy sibling.
export function selectPrimaryGoogleConnection(
  connections: readonly ProviderConnection[],
): ProviderConnection | null {
  if (connections.length === 0) return null;
  const target = toGoogleConnectionState(connections);
  const primary = connections.find(
    (connection) =>
      translateConnection(connection.state, connection.stateReason) === target,
  );
  return primary ?? connections[0] ?? null;
}

export function toGoogleSyncConnectionSummary(
  connection: ProviderConnection,
): GoogleSyncConnectionSummary {
  return {
    id: connection.id,
    state: connection.state,
    stateReason: connection.stateReason,
    lastSyncedAt: connection.lastSyncedAt,
    lastHealthyAt: connection.lastHealthyAt,
    accountEmail: connection.account.email,
    // This connection's own product state, so the browser can render one
    // account's status and reconnect without knowing sync's vocabulary. The
    // top-level `connectionState` stays the precedence winner across all
    // connections; this is deliberately per-connection and may differ.
    connectionState: translateConnection(
      connection.state,
      connection.stateReason,
    ),
  };
}
