import { UserInfo_Google } from "@core/types/auth.types";
import { Logger } from "@core/logger/winston.logger";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";
import userService from "@backend/user/services/user.service";
import { Schema_User } from "@core/types/user.types";
import { BaseError } from "@core/errors/errors.base";

const logger = Logger("app:compass.auth.service");

export const findCompassUser = async (googleId: string) => {
  const user = (await mongoService.db.collection(Collections.USER).findOne({
    googleId,
  })) as Schema_User | null;

  return { userExists: user !== null, user };
};

// wont i need to handle invalid refresh tokens more
// manually, tho?
const updateRefreshToken = async (userId: string, newRefreshToken: string) => {
  logger.error("\nTODO: handle invalid / expired refresh tokens\n");
  // const response = await mongoService.db
  //   .collection(Collections.USER)
  //   .findOneAndUpdate(
  //     { _id: mongoService.objectId(userId) },
  //     { $set: event }, //...tbd
  //     { returnDocument: "after" }
  //   );
  // return response;
};

class CompassAuthService {
  async initUser(gUserInfo: UserInfo_Google) {
    const { gUser } = gUserInfo;
    const googleId = gUser.sub;

    const user = await findCompassUser(googleId);
    const isExistingUser = user !== null;

    let compassUserId: string;
    if (isExistingUser) {
      compassUserId = user._id.toString();
    } else {
      const refreshToken = gUserInfo.tokens.refresh_token;
      if (!refreshToken) {
        return new BaseError(
          "Create User Failed",
          "Failed to create Compass user, because no gcal refresh token provided",
          Status.BAD_REQUEST,
          true
        );
      }

      compassUserId = await userService.createUser(gUser, refreshToken);
    }

    const authType = isExistingUser ? "login" : "signup";

    return {
      authType,
      userId: compassUserId,
      refreshToken: user?.google.refreshToken,
    };
  }

  async updateOauthId(
    userId: string,
    userData: CombinedLogin_GoogleOLD
  ): Promise<Schema_Oauth> {
    logger.debug(`Setting oauth data for compass user: ${userId}`);

    const updatedOauthUser = Object.assign({}, userData.oauth, {
      user: userId,
    });

    const response = await mongoService.db
      .collection(Collections.OAUTH)
      .findOneAndUpdate(
        { user: updatedOauthUser.user },
        { $set: updatedOauthUser },
        { upsert: true, returnDocument: "after" }
      );
    const updatedOAuth = response.value;

    // @ts-ignore
    return updatedOAuth as Schema_Oauth;
  }
}

export default new CompassAuthService();

/*
  async loginToCompassOLD(loginData: CombinedLogin_GoogleOLD) {
    // determine if Compass user already exists by looking
    // for their googleid
    const compassUser = await mongoService.db
      .collection(Collections.USER)
      .findOne({ googleId: loginData.user.id });

    let compassUserId: string;
    if (compassUser) {
      compassUserId = compassUser._id.toString();
    } else {
      compassUserId = await userService.createUserOLD(loginData);
    }

    const updateOauthRes = await this.updateOauthId(compassUserId, loginData);
    return updateOauthRes;
  }

*/
