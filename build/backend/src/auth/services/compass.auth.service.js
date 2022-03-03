"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const winston_logger_1 = require("@core/logger/winston.logger");
const collections_1 = require("@backend/common/constants/collections");
const mongo_service_1 = (0, tslib_1.__importDefault)(
  require("@backend/common/services/mongo.service")
);
const user_service_1 = (0, tslib_1.__importDefault)(
  require("@backend/user/services/user.service")
);
const logger = (0, winston_logger_1.Logger)("app:compass.auth.service");
class CompassAuthService {
  loginToCompass(loginData) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      // use googleId to check if user exists in Compass' DB
      const compassUser = yield mongo_service_1.default.db
        .collection(collections_1.Collections.USER)
        .findOne({ googleId: loginData.user.id });
      let compassUserId;
      if (compassUser) {
        compassUserId = compassUser._id.toString();
      } else {
        compassUserId = yield user_service_1.default.createUser(loginData);
      }
      const updateOauthRes = yield this.updateOauthId(compassUserId, loginData);
      return updateOauthRes;
    });
  }
  updateOauthId(userId, userData) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      logger.debug(`Setting oauth data for compass user: ${userId}`);
      const updatedOauthUser = Object.assign({}, userData.oauth, {
        user: userId,
      });
      const response = yield mongo_service_1.default.db
        .collection(collections_1.Collections.OAUTH)
        .findOneAndUpdate(
          { user: updatedOauthUser.user },
          { $set: updatedOauthUser },
          { upsert: true, returnDocument: "after" }
        );
      const updatedOAuth = response.value;
      return updatedOAuth;
    });
  }
}
exports.default = CompassAuthService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGFzcy5hdXRoLnNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9iYWNrZW5kL3NyYy9hdXRoL3NlcnZpY2VzL2NvbXBhc3MuYXV0aC5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLGdFQUFxRDtBQUNyRCx1RUFBb0U7QUFDcEUsd0dBQWtFO0FBQ2xFLG9HQUE4RDtBQUU5RCxNQUFNLE1BQU0sR0FBRyxJQUFBLHVCQUFNLEVBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUVsRCxNQUFNLGtCQUFrQjtJQUNoQixjQUFjLENBQUMsU0FBK0I7O1lBQ2xELHNEQUFzRDtZQUN0RCxNQUFNLFdBQVcsR0FBRyxNQUFNLHVCQUFZLENBQUMsRUFBRTtpQkFDdEMsVUFBVSxDQUFDLHlCQUFXLENBQUMsSUFBSSxDQUFDO2lCQUM1QixPQUFPLENBQUMsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBRTVDLElBQUksYUFBcUIsQ0FBQztZQUMxQixJQUFJLFdBQVcsRUFBRTtnQkFDZixhQUFhLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQzthQUM1QztpQkFBTTtnQkFDTCxhQUFhLEdBQUcsTUFBTSxzQkFBVyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQzthQUN6RDtZQUVELE1BQU0sY0FBYyxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDMUUsT0FBTyxjQUFjLENBQUM7UUFDeEIsQ0FBQztLQUFBO0lBRUssYUFBYSxDQUNqQixNQUFjLEVBQ2QsUUFBOEI7O1lBRTlCLE1BQU0sQ0FBQyxLQUFLLENBQUMsd0NBQXdDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFFL0QsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFO2dCQUN6RCxJQUFJLEVBQUUsTUFBTTthQUNiLENBQUMsQ0FBQztZQUVILE1BQU0sUUFBUSxHQUFHLE1BQU0sdUJBQVksQ0FBQyxFQUFFO2lCQUNuQyxVQUFVLENBQUMseUJBQVcsQ0FBQyxLQUFLLENBQUM7aUJBQzdCLGdCQUFnQixDQUNmLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixDQUFDLElBQUksRUFBRSxFQUMvQixFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxFQUMxQixFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLE9BQU8sRUFBRSxDQUMxQyxDQUFDO1lBQ0osTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQztZQUVwQyxPQUFPLFlBQTRCLENBQUM7UUFDdEMsQ0FBQztLQUFBO0NBQ0Y7QUFFRCxrQkFBZSxrQkFBa0IsQ0FBQyJ9
