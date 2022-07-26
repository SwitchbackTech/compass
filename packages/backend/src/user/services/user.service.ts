import { mapUserToCompass } from "@core/mappers/map.user";
import { UserInfo_Google } from "@core/types/auth.types";
import { Logger } from "@core/logger/winston.logger";
import mongoService from "@backend/common/services/mongo.service";
import { Collections } from "@backend/common/constants/collections";
import { AuthError, error } from "@backend/common/errors/types/backend.errors";

const logger = Logger("app:user.service");

class UserService {
  createUser = async (
    gUser: UserInfo_Google["gUser"],
    refreshToken: string
  ) => {
    const _compassUser = mapUserToCompass(gUser, refreshToken);
    const compassUser = { ..._compassUser, signedUpAt: new Date() };

    const createUserRes = await mongoService.db
      .collection(Collections.USER)
      .insertOne(compassUser);

    const userId = createUserRes.insertedId.toString();
    if (!userId) {
      throw error(AuthError.UserCreateFailed, "Failed to create Compass user");
    }

    return userId;
  };

  // TODO implement script to call this for easy DB cleaning
  // only do this if the user matches the provided
  // access Token (verify that works)
  // why: prevent anyone from calling this
  // only run if isDev() [for now]
  async deleteUser(userId: string) {
    logger.info(`Deleting all data for user: ${userId}`);

    const filter = { _id: mongoService.objectId(userId) };
    const response = await mongoService.db
      .collection(Collections.USER)
      .deleteOne(filter);
    return response;
  }
  saveTimeFor = async (label: "lastLoggedInAt", userId: string) => {
    const res = await mongoService.db
      .collection(Collections.USER)
      .findOneAndUpdate(
        { _id: mongoService.objectId(userId) },
        { $set: { [label]: new Date() } }
      );

    return res;
  };
}

export default new UserService();
