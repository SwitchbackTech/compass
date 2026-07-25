import {
  type MigrateConnectionResult,
  type MigrateConnectionsReport,
  MigrateConnectionsReportSchema,
} from "@scripts/commands/migrate-connections/report.types";
import { type ObjectId } from "mongodb";
import {
  type ConnectionId,
  type PrincipalId,
  ProviderAccountIdSchema,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { type Schema_User } from "@core/types/user.types";
import { toSyncPrincipal } from "@backend/common/services/sync-service/sync-principal";
import { GOOGLE_SCOPES } from "@sync/providers/google/google.scopes";
import { googleCapabilitiesFromScopes } from "@sync/providers/google/google-capabilities";
import { type CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { type ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";

export interface MigrateConnectionSourceUser {
  _id: ObjectId;
  email: string;
  google?: Schema_User["google"];
}

export interface MigrateConnectionsDeps {
  connections: ProviderConnectionRepository;
  credentials: CredentialRepository;
}

export interface MigrateConnectionsOptions {
  dryRun: boolean;
  now?: Date;
  /** When set, only these Compass user ids are considered. */
  userIds?: ReadonlySet<string>;
}

function hasRefreshToken(user: MigrateConnectionSourceUser): boolean {
  return Boolean(user.google?.gRefreshToken?.trim());
}

/**
 * Idempotently upsert Sync provider connections + credentials from legacy
 * Compass users (S47). Never clears source tokens, never enqueues Sync jobs,
 * never calls Google.
 */
export async function migrateProviderConnections(
  deps: MigrateConnectionsDeps,
  users: readonly MigrateConnectionSourceUser[],
  options: MigrateConnectionsOptions,
): Promise<MigrateConnectionsReport> {
  const now = options.now ?? new Date();
  const scopes = [...GOOGLE_SCOPES];
  const capabilities = googleCapabilitiesFromScopes(scopes);
  const results: MigrateConnectionResult[] = [];

  const selected = [...users]
    .filter((user) =>
      options.userIds ? options.userIds.has(user._id.toHexString()) : true,
    )
    .sort((a, b) => a._id.toHexString().localeCompare(b._id.toHexString()));

  for (const user of selected) {
    const userId = user._id.toHexString();
    const principal = toSyncPrincipal(userId);
    const tenantId = principal.tenantId as TenantId;
    const principalId = principal.principalId as PrincipalId;
    const accountEmail = user.email?.trim() || null;

    if (!user.google) {
      results.push({
        userId,
        tenantId,
        principalId,
        providerAccountId: null,
        accountEmail,
        action: "skipped",
        connectionId: null,
        credentialVerified: false,
        skipCategory: "no_google_identity",
        detail: "user has no google identity",
      });
      continue;
    }

    const providerAccountId = user.google.googleId?.trim() || null;
    if (!providerAccountId) {
      results.push({
        userId,
        tenantId,
        principalId,
        providerAccountId: null,
        accountEmail,
        action: "skipped",
        connectionId: null,
        credentialVerified: false,
        skipCategory: "empty_google_id",
        detail: "user google.googleId is empty",
      });
      continue;
    }

    if (!hasRefreshToken(user)) {
      results.push({
        userId,
        tenantId,
        principalId,
        providerAccountId,
        accountEmail,
        action: "skipped",
        connectionId: null,
        credentialVerified: false,
        skipCategory: "missing_refresh_token",
        detail: "user has google identity but empty gRefreshToken",
      });
      continue;
    }

    const existing = (
      await deps.connections.listByPrincipal(tenantId, principalId)
    ).find(
      (connection) =>
        connection.provider === "google" &&
        connection.account.providerAccountId === providerAccountId,
    );
    const existed = existing !== undefined;

    if (options.dryRun) {
      results.push({
        userId,
        tenantId,
        principalId,
        providerAccountId,
        accountEmail,
        action: existed ? "would_update" : "would_create",
        connectionId: existing?._id ?? null,
        credentialVerified: false,
        skipCategory: null,
        detail: existed
          ? "would upsert connection and refresh credential in Sync custody"
          : "would create connection and store credential in Sync custody",
      });
      continue;
    }

    const connection = await deps.connections.upsertByProviderAccount({
      tenantId,
      principalId,
      provider: "google",
      account: {
        providerAccountId: ProviderAccountIdSchema.parse(providerAccountId),
        email: accountEmail,
        displayName: null,
      },
      capabilities,
      // Same derived posture as a freshly linked account before first import.
      state: "importing",
      stateReason: null,
      lastSyncedAt: null,
      lastHealthyAt: null,
    });

    await deps.credentials.store({
      connectionId: connection._id as ConnectionId,
      provider: "google",
      refreshToken: user.google.gRefreshToken.trim(),
      scopes,
    });

    const stored = await deps.credentials.findByConnection(connection._id);
    const credentialVerified =
      stored !== null &&
      stored.refreshToken === user.google.gRefreshToken.trim() &&
      scopes.every((scope) => stored.scopes.includes(scope));

    results.push({
      userId,
      tenantId,
      principalId,
      providerAccountId,
      accountEmail,
      action: existed ? "updated" : "created",
      connectionId: connection._id,
      credentialVerified,
      skipCategory: null,
      detail: existed
        ? "upserted connection and refreshed credential in Sync custody"
        : "created connection and stored credential in Sync custody",
    });
  }

  const counts = {
    scanned: selected.length,
    wouldCreate: results.filter((r) => r.action === "would_create").length,
    wouldUpdate: results.filter((r) => r.action === "would_update").length,
    created: results.filter((r) => r.action === "created").length,
    updated: results.filter((r) => r.action === "updated").length,
    skipped: results.filter((r) => r.action === "skipped").length,
  };

  return MigrateConnectionsReportSchema.parse({
    generatedAt: now.toISOString(),
    dryRun: options.dryRun,
    counts,
    results,
  });
}
