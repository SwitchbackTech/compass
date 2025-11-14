import mergeWith from "lodash.mergewith";
import SupertokensUserMetadata, {
  JSONObject,
} from "supertokens-node/recipe/usermetadata";
import { UserMetadata } from "@core/types/user.types";

class UserMetadataService {
  /*
   * updateUserMetadata
   *
   * Nested objects and all lower-level properties
   * will merge with existing ones.
   *
   * @memberOf UserMetadataService
   */
  updateUserMetadata = async ({
    userId,
    data,
  }: {
    userId: string;
    data: Partial<UserMetadata>;
  }): Promise<UserMetadata> => {
    const value = await this.fetchUserMetadata(userId);
    const update = mergeWith(value, data);

    const { status, metadata } =
      await SupertokensUserMetadata.updateUserMetadata(userId, update);

    if (status !== "OK") throw new Error("Failed to update user metadata");

    return metadata;
  };

  fetchUserMetadata = async (
    userId: string,
    userContext?: Record<string, JSONObject>,
  ): Promise<UserMetadata> => {
    const { status, metadata } = await SupertokensUserMetadata.getUserMetadata(
      userId,
      userContext,
    );

    if (status !== "OK") throw new Error("Failed to fetch user metadata");

    return metadata;
  };
}

export default new UserMetadataService();
