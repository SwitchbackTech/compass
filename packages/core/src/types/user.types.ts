import SupertokensUserMetadata from "supertokens-node/recipe/usermetadata";
import { WithCompassId } from "./event.types";

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

type SyncStatus = "importing" | "errored" | "completed" | "restart" | null;

export interface UserMetadata extends SupertokensUserMetadata.JSONObject {
  skipOnboarding?: boolean;
  sync?: {
    importGCal?: SyncStatus;
    incrementalGCalSync?: SyncStatus;
  };
}

export interface UserProfile
  extends Pick<
    WithCompassId<Schema_User>,
    "firstName" | "lastName" | "name" | "email" | "locale"
  > {
  picture: string;
  userId: string;
}
