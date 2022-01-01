import {
  Schema_User,
  Result_Delete_User,
} from "@compass/core/src/types/user.types";
import { CombinedLogin_Google } from "@core/types/auth.types";
import { Logger } from "@common/logger/common.logger";
import { BaseError } from "@core/errors/errors.base";
import mongoService from "@common/services/mongo.service";
import { Collections } from "@common/constants/collections";

const logger = Logger("app:user.service");

// Map  user object given by google signin to our schema //
const mapToCompassUser = (userData: CombinedLogin_Google): Schema_User => {
  return {
    email: userData.user.email,
    name: userData.user.name,
    picture: userData.user.picture,
    googleId: userData.user.id,
  };
};

class UserService {
  createUser = async (userData: CombinedLogin_Google) => {
    logger.debug("Creating new user");
    const compassUser = mapToCompassUser(userData);
    //TODO validate
    const createUserRes = await mongoService.db
      .collection(Collections.USER)
      .insertOne(compassUser);

    const userId = createUserRes.insertedId.toString();
    return userId;
  };

  // TODO implement script to call this for easy DB cleaning
  async deleteUserData(
    userId: string
  ): Promise<Result_Delete_User | BaseError> {
    logger.info(`Deleting all data for user: ${userId}`);

    try {
      //TODO add priorities
      const eventsResponse = await mongoService.db
        .collection(Collections.EVENT)
        .deleteMany({ user: userId });

      const oauthResponse = await mongoService.db
        .collection(Collections.OAUTH)
        .deleteOne({ user: userId });

      const userResponse = await mongoService.db
        .collection(Collections.USER)
        .deleteOne({ _id: mongoService.objectId(userId) });

      const summary: Result_Delete_User = {
        events: eventsResponse,
        oauth: oauthResponse,
        user: userResponse,
        errors: [],
      };
      return summary;
    } catch (e) {
      logger.error(e);
      return new BaseError("Delete User Data Failed", e, 500, true);
    }
  }
}
export default new UserService();
