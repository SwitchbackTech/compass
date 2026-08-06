import type SupertokensUserMetadata from "supertokens-node/recipe/usermetadata";
import { type WithId } from "./type.utils";

export interface Schema_User {
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  locale: string;
  google?: {
    googleId: string;
    picture: string;
    gRefreshToken: string;
  };
  signedUpAt?: Date;
  lastLoggedInAt?: Date;
  /** Last time this user's client connected to the SSE stream -- touched on
   *  every (re)connect, distinct from `lastLoggedInAt`'s sign-in moment.
   *  Used to tell an active user apart from an abandoned account (A40). */
  lastSeenAt?: Date;
}

type SyncStatus = "IMPORTING" | "ERRORED" | "COMPLETED" | "RESTART" | null;

/**
 * Unified Google connection state computed by the server.
 * Clients read this value directly instead of deriving state from multiple sources.
 */
export type GoogleConnectionState =
  | "NOT_CONNECTED"
  | "RECONNECT_REQUIRED"
  | "IMPORTING"
  | "HEALTHY"
  | "ATTENTION";

// Sync-backed connection summary for the browser (S41). Present only when
// connection routing is delegated to Sync. IDs/timestamps/state only — never
// credentials or event content. Plain strings so the payload stays a
// SuperTokens JSONObject (no Zod brands on the metadata wire).
// A type alias, not an interface: only aliases get the implicit index
// signature that lets these values sit inside SuperTokens' JSONObject
// metadata payload without a cast at every call site.
export type GoogleSyncConnectionSummary = {
  id: string;
  state: string;
  stateReason: string | null;
  lastSyncedAt: string | null;
  lastHealthyAt: string | null;
  accountEmail: string | null;
  // This one connection's own product state, translated server-side from its
  // sync state/reason. The browser renders per-account status and reconnect
  // from it directly, so sync's state vocabulary stays on the server.
  connectionState: GoogleConnectionState;
};

// Intersection (not extends): SuperTokens JSONObject's string index signature
// rejects a nested `google.connection` object on an interface extends clause,
// even though every field is JSON-safe.
export type UserMetadata = SupertokensUserMetadata.JSONObject & {
  sync?: {
    importGCal?: SyncStatus;
    incrementalGCalSync?: SyncStatus;
  };
  google?: {
    connectionState?: GoogleConnectionState;
    // Every connected provider account, in connection order. The
    // precedence-winning one (for the top-level banner / unscoped hooks) is
    // derived client-side from this plus connectionState - see
    // selectPrimaryGoogleSyncConnection.
    connections?: GoogleSyncConnectionSummary[];
  };
};

export interface UserProfile
  extends Pick<
    WithId<Schema_User>,
    "firstName" | "lastName" | "name" | "email" | "locale"
  > {
  picture: string;
  userId: string;
}
