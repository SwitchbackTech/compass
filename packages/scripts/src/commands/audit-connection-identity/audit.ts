import { type Db } from "mongodb";
import {
  type ProviderKind,
  ProviderKindSchema,
} from "@core/types/sync/identity.contracts";
import { Collections } from "@backend/common/constants/collections";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";

export type ConnectionIdentityCollision = {
  // The Compass user who added the connection (data-only, per A2).
  connectingUserId: string;
  connectionId: string;
  provider: ProviderKind;
  // The connected provider account.
  accountEmail: string | null;
  // The Compass user whose SIGN-IN identity that account is.
  loginOwnerUserId: string;
  loginOwnerEmail: string;
};

export type ConnectionIdentityAuditReport = {
  generatedAt: string;
  providersAudited: ProviderKind[];
  loginIdentitiesIndexed: number;
  connectionsChecked: number;
  collisions: ConnectionIdentityCollision[];
};

export type AuditConnectionIdentityOptions = {
  /** When omitted, every provider kind is audited. */
  provider?: ProviderKind;
};

interface UserLoginIdentityDoc {
  provider: ProviderKind;
  subjectId: string;
  email?: string;
}

interface UserLoginDoc {
  _id: unknown;
  email: string;
  google?: { googleId?: string };
  identities?: UserLoginIdentityDoc[];
}

interface ConnectionDoc {
  _id: unknown;
  principalId: string;
  provider: ProviderKind;
  account: { providerAccountId: string; email: string | null };
}

export const ALL_PROVIDER_KINDS: readonly ProviderKind[] =
  ProviderKindSchema.options;

export function resolveProvidersToAudit(
  provider?: ProviderKind,
): readonly ProviderKind[] {
  return provider ? [provider] : ALL_PROVIDER_KINDS;
}

export function loginIdentityMapKey(
  provider: ProviderKind,
  subjectId: string,
): string {
  return `${provider}\0${subjectId}`;
}

function userLoginQuery(providers: readonly ProviderKind[]) {
  const clauses: Record<string, unknown>[] = [];
  if (providers.includes("google")) {
    clauses.push({ "google.googleId": { $exists: true } });
  }
  const identityProviders = providers.filter((kind) => kind !== "google");
  if (identityProviders.length > 0) {
    clauses.push({
      identities: {
        $elemMatch: { provider: { $in: identityProviders } },
      },
    });
  }
  return clauses.length === 1 ? clauses[0]! : { $or: clauses };
}

function connectionQuery(providers: readonly ProviderKind[]) {
  return {
    provider: providers.length === 1 ? providers[0]! : { $in: [...providers] },
    disconnectedAt: null,
  };
}

function indexUserLoginIdentities(
  user: UserLoginDoc,
  providers: ReadonlySet<ProviderKind>,
  loginByKey: Map<string, { userId: string; email: string }>,
): void {
  const userId = String(user._id);
  if (providers.has("google")) {
    const googleId = user.google?.googleId;
    if (googleId) {
      loginByKey.set(loginIdentityMapKey("google", googleId), {
        userId,
        email: user.email,
      });
    }
  }
  for (const identity of user.identities ?? []) {
    if (!providers.has(identity.provider)) continue;
    loginByKey.set(loginIdentityMapKey(identity.provider, identity.subjectId), {
      userId,
      email: identity.email ?? user.email,
    });
  }
}

/**
 * Read-only: finds every connected provider account that is actually another
 * Compass user's SIGN-IN identity - the collision A2 says a connect attempt
 * should reject going forward, and this reports for anything that already
 * slipped through (there was a window before that guard existed, and any
 * future regression in it).
 *
 * Never writes. Matches by `(provider, providerAccountId)` (the provider's
 * stable subject id), never email - email is mutable display data on both
 * sides (ProviderAccountFactsSchema's own doc comment), so an email match
 * alone would be a false positive whenever two different accounts have ever
 * shared an address (a common re-registration pattern), and a false negative
 * whenever the same account's email changed.
 */
export async function auditConnectionIdentity(
  compassDb: Db,
  syncDb: Db,
  options: AuditConnectionIdentityOptions = {},
): Promise<ConnectionIdentityAuditReport> {
  const providers = resolveProvidersToAudit(options.provider);
  const providerSet = new Set(providers);
  const loginByKey = new Map<string, { userId: string; email: string }>();

  const users = compassDb
    .collection<UserLoginDoc>(Collections.USER)
    .find(userLoginQuery(providers));
  for await (const user of users) {
    indexUserLoginIdentities(user, providerSet, loginByKey);
  }

  const collisions: ConnectionIdentityCollision[] = [];
  let connectionsChecked = 0;

  const connections = syncDb
    .collection<ConnectionDoc>(SYNC_COLLECTIONS.providerConnections)
    .find(connectionQuery(providers));
  for await (const connection of connections) {
    connectionsChecked += 1;
    const loginOwner = loginByKey.get(
      loginIdentityMapKey(
        connection.provider,
        connection.account.providerAccountId,
      ),
    );
    if (!loginOwner) continue;
    // Reconnecting/re-adding your OWN login account as a data connection is
    // not a collision - A2 only forbids using someone ELSE's login identity.
    if (loginOwner.userId === connection.principalId) continue;

    collisions.push({
      connectingUserId: connection.principalId,
      connectionId: String(connection._id),
      provider: connection.provider,
      accountEmail: connection.account.email,
      loginOwnerUserId: loginOwner.userId,
      loginOwnerEmail: loginOwner.email,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    providersAudited: [...providers],
    loginIdentitiesIndexed: loginByKey.size,
    connectionsChecked,
    collisions,
  };
}
