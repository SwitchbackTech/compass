import { ObjectId } from "bson";
import SupertokensUserMetadata from "supertokens-node/recipe/usermetadata";

export interface Schema_User {
  _id: ObjectId;
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
    importGCal?: "importing" | "errored" | "completed" | "restart" | null;
  };
}
