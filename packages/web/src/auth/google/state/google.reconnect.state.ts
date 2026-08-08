/**
 * Session-scoped reconnect-required overrides for Google accounts.
 *
 * Sync metadata can lag behind a live `410 GOOGLE_REVOKED` (or briefly report
 * healthy/catchingUp while credentials are already dead). This store keeps a
 * durable per-account truth so toast, sidebar, Settings, and write gates stay
 * congruent until metadata catches up or the user reconnects.
 */

export type GoogleReconnectTarget = {
  connectionId?: string | null;
  accountEmail?: string | null;
};

const reconnectRequiredConnectionIds = new Set<string>();
const reconnectRequiredAccountEmails = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

const notify = (): void => {
  version += 1;
  for (const listener of listeners) {
    listener();
  }
};

const normalizeEmail = (email: string | null | undefined): string | null => {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
};

export function subscribeToGoogleReconnectRequired(
  listener: () => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Snapshot key for useSyncExternalStore — changes whenever the set mutates. */
export function getGoogleReconnectRequiredVersion(): number {
  return version;
}

export function markAccountReconnectRequired(
  target: GoogleReconnectTarget,
): void {
  const connectionId = target.connectionId?.trim() || null;
  const accountEmail = normalizeEmail(target.accountEmail);
  if (!connectionId && !accountEmail) return;

  let changed = false;
  if (connectionId && !reconnectRequiredConnectionIds.has(connectionId)) {
    reconnectRequiredConnectionIds.add(connectionId);
    changed = true;
  }
  if (accountEmail && !reconnectRequiredAccountEmails.has(accountEmail)) {
    reconnectRequiredAccountEmails.add(accountEmail);
    changed = true;
  }
  if (changed) notify();
}

export function clearAccountReconnectRequired(
  target: GoogleReconnectTarget,
): void {
  const connectionId = target.connectionId?.trim() || null;
  const accountEmail = normalizeEmail(target.accountEmail);
  let changed = false;
  if (connectionId && reconnectRequiredConnectionIds.delete(connectionId)) {
    changed = true;
  }
  if (accountEmail && reconnectRequiredAccountEmails.delete(accountEmail)) {
    changed = true;
  }
  if (changed) notify();
}

export function clearAllGoogleReconnectRequired(): void {
  if (
    reconnectRequiredConnectionIds.size === 0 &&
    reconnectRequiredAccountEmails.size === 0
  ) {
    return;
  }
  reconnectRequiredConnectionIds.clear();
  reconnectRequiredAccountEmails.clear();
  notify();
}

/**
 * Align session overrides with the latest metadata connections:
 * - add every metadata `RECONNECT_REQUIRED` row
 * - drop overrides only when the connection/account disappears (disconnect)
 *
 * Do **not** clear an override just because metadata still reports healthy /
 * catchingUp — that lag is exactly why the session override exists after a
 * live `410 GOOGLE_REVOKED`. Successful reconnect uses a full navigation, which
 * drops this in-memory state; Disconnect removes the connection row.
 */
export function syncReconnectRequiredFromConnections(
  connections: ReadonlyArray<{
    id: string;
    accountEmail: string | null;
    connectionState: string;
  }>,
): void {
  const presentIds = new Set(connections.map((connection) => connection.id));
  const presentEmails = new Set(
    connections
      .map((connection) => normalizeEmail(connection.accountEmail))
      .filter((email): email is string => Boolean(email)),
  );
  let changed = false;

  for (const connection of connections) {
    if (connection.connectionState !== "RECONNECT_REQUIRED") continue;

    if (!reconnectRequiredConnectionIds.has(connection.id)) {
      reconnectRequiredConnectionIds.add(connection.id);
      changed = true;
    }
    const email = normalizeEmail(connection.accountEmail);
    if (email && !reconnectRequiredAccountEmails.has(email)) {
      reconnectRequiredAccountEmails.add(email);
      changed = true;
    }
  }

  for (const connectionId of [...reconnectRequiredConnectionIds]) {
    if (!presentIds.has(connectionId)) {
      reconnectRequiredConnectionIds.delete(connectionId);
      changed = true;
    }
  }

  for (const email of [...reconnectRequiredAccountEmails]) {
    if (!presentEmails.has(email)) {
      reconnectRequiredAccountEmails.delete(email);
      changed = true;
    }
  }

  if (changed) notify();
}

export function isConnectionReconnectRequired(
  connectionId: string | null | undefined,
): boolean {
  const id = connectionId?.trim();
  return Boolean(id && reconnectRequiredConnectionIds.has(id));
}

export function isAccountReconnectRequired(
  accountEmail: string | null | undefined,
): boolean {
  const email = normalizeEmail(accountEmail);
  return Boolean(email && reconnectRequiredAccountEmails.has(email));
}

export function hasGoogleReconnectRequired(): boolean {
  return (
    reconnectRequiredConnectionIds.size > 0 ||
    reconnectRequiredAccountEmails.size > 0
  );
}

export function getGoogleReconnectRequiredAccountEmails(): ReadonlySet<string> {
  return reconnectRequiredAccountEmails;
}

export function getGoogleReconnectRequiredConnectionIds(): ReadonlySet<string> {
  return reconnectRequiredConnectionIds;
}

/** Test-only reset. */
export function resetGoogleReconnectRequiredForTests(): void {
  reconnectRequiredConnectionIds.clear();
  reconnectRequiredAccountEmails.clear();
  version = 0;
}
