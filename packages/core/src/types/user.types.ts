import type SupertokensUserMetadata from "supertokens-node/recipe/usermetadata";
import { type WithCompassId } from "./event.types";

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

export interface UserMetadata extends SupertokensUserMetadata.JSONObject {
  skipOnboarding?: boolean;
  sync?: {
    importGCal?: SyncStatus;
    incrementalGCalSync?: SyncStatus;
  };
  google?: {
    connectionState?: GoogleConnectionState;
  };
  subscribeToUpdates?: boolean;
}

export interface UserProfile
  extends Pick<
    WithCompassId<Schema_User>,
    "firstName" | "lastName" | "name" | "email" | "locale"
  > {
  picture: string;
  userId: string;
}
