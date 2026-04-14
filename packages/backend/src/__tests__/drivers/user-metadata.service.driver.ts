import userMetadataService from "@backend/user/services/user-metadata.service";
import { type UserMetadata } from "@core/types/user.types";
import { type JSONObject } from "supertokens-node/recipe/usermetadata";

export class UserMetadataServiceDriver {
  updateUserMetadata(params: {
    userId: string;
    data: Partial<UserMetadata>;
  }): Promise<UserMetadata> {
    return userMetadataService.updateUserMetadata(params);
  }

  fetchUserMetadata(
    userId: string,
    userContext?: Record<string, JSONObject>,
  ): Promise<UserMetadata> {
    return userMetadataService.fetchUserMetadata(userId, userContext);
  }
}
