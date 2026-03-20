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
}

type SyncStatus = "IMPORTING" | "ERRORED" | "COMPLETED" | "RESTART" | null;

/**
 * Unified Google connection state computed by the server.
 * Clients should read this value directly instead of deriving state from multiple sources.
 */
export type GoogleConnectionState =
  | "NOT_CONNECTED" // No Google account linked
  | "RECONNECT_REQUIRED" // Refresh token missing/invalid
  | "IMPORTING" // Full sync in progress
  | "HEALTHY" // Connected and all watches active
  | "ATTENTION"; // Connected but needs repair

/**
 * @deprecated Use GoogleConnectionState instead. This type will be removed in a future release.
 */
export type GoogleConnectionStatus =
  | "NOT_CONNECTED"
  | "CONNECTED"
  | "RECONNECT_REQUIRED";

/**
 * @deprecated Use GoogleConnectionState instead. This type will be removed in a future release.
 */
export type GoogleSyncStatus = "HEALTHY" | "REPAIRING" | "ATTENTION" | "NONE";

export interface UserMetadata extends SupertokensUserMetadata.JSONObject {
  skipOnboarding?: boolean;
  sync?: {
    importGCal?: SyncStatus;
    incrementalGCalSync?: SyncStatus;
  };
  google?: {
    /** Unified connection state computed by the server */
    connectionState?: GoogleConnectionState;
    /** @deprecated Use connectionState instead */
    hasRefreshToken?: boolean;
    /** @deprecated Use connectionState instead */
    connectionStatus?: GoogleConnectionStatus;
    /** @deprecated Use connectionState instead */
    syncStatus?: GoogleSyncStatus;
  };
}

export interface UserProfile extends Pick<
  WithCompassId<Schema_User>,
  "firstName" | "lastName" | "name" | "email" | "locale"
> {
  picture: string;
  userId: string;
}
