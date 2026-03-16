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
export type GoogleConnectionStatus =
  | "NOT_CONNECTED"
  | "CONNECTED"
  | "RECONNECT_REQUIRED";
export type GoogleSyncStatus = "HEALTHY" | "REPAIRING" | "ATTENTION" | "NONE";

export interface UserMetadata extends SupertokensUserMetadata.JSONObject {
  skipOnboarding?: boolean;
  sync?: {
    importGCal?: SyncStatus;
    incrementalGCalSync?: SyncStatus;
  };
  google?: {
    hasRefreshToken?: boolean;
    connectionStatus?: GoogleConnectionStatus;
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
