import { mapUserToCompass } from "@core/mappers/map.user";
import { Result_Delete_User } from "@core/types/user.types";
import {
  CombinedLogin_GoogleOLD,
  UserInfo_Google,
} from "@core/types/auth.types";
import { BaseError } from "@core/errors/errors.base";
import { Logger } from "@core/logger/winston.logger";
import mongoService from "@backend/common/services/mongo.service";
import { Collections } from "@backend/common/constants/collections";

const logger = Logger("app:user.service");

class UserService {
  createUser = async (gUserInfo: UserInfo_Google) => {
    const compassUser = mapUserToCompass(gUserInfo);

    const createUserRes = await mongoService.db
      .collection(Collections.USER)
      .insertOne(compassUser);

    const userId = createUserRes.insertedId.toString();
    return userId;
  };

  createUserOLD = async (userData: CombinedLogin_GoogleOLD) => {
    logger.debug("Creating new user");
    const compassUser = MapUser.toCompass(userData);
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
      return new BaseError(
        "Delete User Data Failed",
        JSON.stringify(e),
        500,
        true
      );
    }
  }
}

export default new UserService();
