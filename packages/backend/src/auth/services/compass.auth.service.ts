import { CombinedLogin$Google } from "@core/types/auth.types";
import { OAuthDTO } from "@core/types/auth.types";
import { Logger } from "@common/logger/common.logger";
import { Collections } from "@common/constants/collections";
import mongoService from "@common/services/mongo.service";
import userService from "@user/services/user.service";

const logger = Logger("app:compass.auth.service");

class CompassAuthService {
  async loginToCompass(loginData: CombinedLogin$Google) {
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

    const oauthResponse = await this.updateOauthId(compassUserId, loginData);
    return oauthResponse;
  }

  async updateOauthId(
    userId: string,
    userData: CombinedLogin$Google
  ): Promise<OAuthDTO> {
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

    return updatedOAuth as OAuthDTO;
  }
}

export default CompassAuthService;
