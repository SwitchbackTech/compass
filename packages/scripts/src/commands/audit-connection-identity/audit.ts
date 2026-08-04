import { type Db } from "mongodb";
import { Collections } from "@backend/common/constants/collections";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";

export type ConnectionIdentityCollision = {
  // The Compass user who added the connection (data-only, per A2).
  connectingUserId: string;
  connectionId: string;
  // The connected Google account.
  accountEmail: string | null;
  // The Compass user whose SIGN-IN identity that Google account is.
  loginOwnerUserId: string;
  loginOwnerEmail: string;
};

export type ConnectionIdentityAuditReport = {
  generatedAt: string;
  usersWithGoogleLogin: number;
  connectionsChecked: number;
  collisions: ConnectionIdentityCollision[];
};

interface UserGoogleLoginDoc {
  _id: unknown;
  email: string;
  google?: { googleId?: string };
}

interface ConnectionDoc {
  _id: unknown;
  principalId: string;
  account: { providerAccountId: string; email: string | null };
}

/**
 * Read-only: finds every connected Google account that is actually another
 * Compass user's SIGN-IN identity - the collision A2 says a connect attempt
 * should reject going forward, and this reports for anything that already
 * slipped through (there was a window before that guard existed, and any
 * future regression in it).
 *
 * Never writes. Matches by `providerAccountId` (Google's stable subject id),
 * never email - email is mutable display data on both sides
 * (ProviderAccountFactsSchema's own doc comment), so an email match alone
 * would be a false positive whenever two different Google accounts have ever
 * shared an address (a common re-registration pattern), and a false negative
 * whenever the same account's email changed.
 */
export async function auditConnectionIdentity(
  compassDb: Db,
  syncDb: Db,
): Promise<ConnectionIdentityAuditReport> {
  const loginByGoogleId = new Map<string, { userId: string; email: string }>();
  const users = compassDb
    .collection<UserGoogleLoginDoc>(Collections.USER)
    .find({ "google.googleId": { $exists: true } });
  for await (const user of users) {
    const googleId = user.google?.googleId;
    if (!googleId) continue;
    loginByGoogleId.set(googleId, {
      userId: String(user._id),
      email: user.email,
    });
  }

  const collisions: ConnectionIdentityCollision[] = [];
  let connectionsChecked = 0;

  const connections = syncDb
    .collection<ConnectionDoc>(SYNC_COLLECTIONS.providerConnections)
    .find({ provider: "google", disconnectedAt: null });
  for await (const connection of connections) {
    connectionsChecked += 1;
    const loginOwner = loginByGoogleId.get(
      connection.account.providerAccountId,
    );
    if (!loginOwner) continue;
    // Reconnecting/re-adding your OWN login account as a data connection is
    // not a collision - A2 only forbids using someone ELSE's login identity.
    if (loginOwner.userId === connection.principalId) continue;

    collisions.push({
      connectingUserId: connection.principalId,
      connectionId: String(connection._id),
      accountEmail: connection.account.email,
      loginOwnerUserId: loginOwner.userId,
      loginOwnerEmail: loginOwner.email,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    usersWithGoogleLogin: loginByGoogleId.size,
    connectionsChecked,
    collisions,
  };
}
