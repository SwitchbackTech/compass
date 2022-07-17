import {
  CombinedLogin_GoogleOLD,
  UserInfo_Google,
} from "@core/types/auth.types";
import { Schema_Oauth } from "@core/types/auth.types";
import { Logger } from "@core/logger/winston.logger";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";
import userService from "@backend/user/services/user.service";
import { Schema_User } from "@core/types/user.types";

const logger = Logger("app:compass.auth.service");

const findCompassUser = async (googleId: string) => {
  const user = (await mongoService.db.collection(Collections.USER).findOne({
    googleId,
  })) as Schema_User | null;
  return user;
};

// wont i need to handle invalid refresh tokens more
// manually, tho?
const updateRefreshToken = async (userId: string, newRefreshToken: string) => {
  logger.error("\nHANDLE INVALID / EXPIRED REFRESH TOKENS\n");
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

  async initUser(gUserInfo: UserInfo_Google) {
    const { tokens } = gUserInfo;
    const { refresh_token } = tokens;
    const googleId = gUserInfo.gUser.sub;

    const user = await findCompassUser(googleId);
    const isExistingUser = user !== null;

    const compassUserId = isExistingUser
      ? user._id.toString()
      : await userService.createUser(gUserInfo);

    if (isExistingUser) {
      if (refresh_token && refresh_token !== user.tokens.refresh_token) {
        console.log(`updating refresh token in user collection, cuz
        old: ${user.tokens.refresh_token || "oops, non"} 
        new: ${refresh_token}
        `);
        await updateRefreshToken(compassUserId, refresh_token);
      }
    }

    const authType = isExistingUser ? "login" : "signup";

    return {
      userId: compassUserId,
      accessToken: gUserInfo.tokens.access_token,
      authType,
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

export default CompassAuthService;
