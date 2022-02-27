import { CombinedLogin_Google } from "@core/types/auth.types";
import { Schema_Oauth } from "@core/types/auth.types";
import { Logger } from "@core/logger/winston.logger";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";
import userService from "@backend/user/services/user.service";

const logger = Logger("app:compass.auth.service");

class CompassAuthService {
  async loginToCompass(loginData: CombinedLogin_Google) {
    // use googleId to check if user exists in Compass' DB
    const compassUser = await mongoService.db
      .collection(Collections.USER)
      .findOne({ googleId: loginData.user.id });

    let compassUserId: string;
    if (compassUser) {
      compassUserId = compassUser._id.toString();
    } else {
      compassUserId = await userService.createUser(loginData);
    }

    const updateOauthRes = await this.updateOauthId(compassUserId, loginData);
    return updateOauthRes;
  }

  async updateOauthId(
    userId: string,
    userData: CombinedLogin_Google
  ): Promise<Schema_Oauth> {
    logger.debug(`Setting oauth data for compass user: ${userId}`);

    const updatedOauthUser = Object.assign({}, userData.oauth, {
      user: userId,
    });
    // await validate(OAUTH, updatedOauth); //TODO

    const response = await mongoService.db
      .collection(Collections.OAUTH)
      .findOneAndUpdate(
        { user: updatedOauthUser.user },
        { $set: updatedOauthUser },
        { upsert: true, returnDocument: "after" }
      );
    const updatedOAuth = response.value;

    return updatedOAuth as Schema_Oauth;
  }
}

export default CompassAuthService;
