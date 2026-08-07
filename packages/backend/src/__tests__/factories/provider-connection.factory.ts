import {
  type ConnectionState,
  type ConnectionStateReason,
  type ProviderConnection,
} from "@core/types/sync/connection.contracts";

// A ProviderConnection is a rich record, but most tests read only state +
// stateReason (plus occasionally id/account); the rest is filled with
// valid-enough placeholders. Built as the plain type (not schema-parsed) so a
// test can pose any state/reason pair, including combinations the schema's
// refinements would reject.
export const providerConnection = (
  state: ConnectionState,
  stateReason: ConnectionStateReason | null = null,
  overrides: Partial<ProviderConnection> = {},
): ProviderConnection =>
  ({
    id: "c1",
    tenantId: "64b7f9c2e1a2b3c4d5e6f7a8",
    principalId: "64b7f9c2e1a2b3c4d5e6f7a8",
    provider: "google",
    account: { providerAccountId: "a1", email: null, displayName: null },
    capabilities: [],
    state,
    stateReason,
    lastSyncedAt: null,
    lastHealthyAt: null,
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
    ...overrides,
  }) as unknown as ProviderConnection;
