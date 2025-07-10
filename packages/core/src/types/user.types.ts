import SupertokensUserMetadata from "supertokens-node/recipe/usermetadata";

export interface Schema_User {
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  locale: string;
  google: {
    googleId: string;
    picture: string;
    gRefreshToken: string;
  };
  signedUpAt?: Date;
  lastLoggedInAt?: Date;
}

export interface UserMetadata extends SupertokensUserMetadata.JSONObject {
  sync?: {
    importGCal?: {
      importing?: boolean; // gCal import in progress
      lastGCalSync?: string; // utc Date string
    };
  };
}
