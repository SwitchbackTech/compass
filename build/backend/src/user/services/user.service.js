"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const map_user_1 = require("@core/mappers/map.user");
const errors_base_1 = require("@core/errors/errors.base");
const winston_logger_1 = require("@core/logger/winston.logger");
const mongo_service_1 = (0, tslib_1.__importDefault)(
  require("@backend/common/services/mongo.service")
);
const collections_1 = require("@backend/common/constants/collections");
const logger = (0, winston_logger_1.Logger)("app:user.service");
class UserService {
  constructor() {
    this.createUser = (userData) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        logger.debug("Creating new user");
        const compassUser = map_user_1.MapUser.toCompass(userData);
        //TODO validate
        const createUserRes = yield mongo_service_1.default.db
          .collection(collections_1.Collections.USER)
          .insertOne(compassUser);
        const userId = createUserRes.insertedId.toString();
        return userId;
      });
  }
  // TODO implement script to call this for easy DB cleaning
  deleteUserData(userId) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      logger.info(`Deleting all data for user: ${userId}`);
      try {
        //TODO add priorities
        const eventsResponse = yield mongo_service_1.default.db
          .collection(collections_1.Collections.EVENT)
          .deleteMany({ user: userId });
        const oauthResponse = yield mongo_service_1.default.db
          .collection(collections_1.Collections.OAUTH)
          .deleteOne({ user: userId });
        const userResponse = yield mongo_service_1.default.db
          .collection(collections_1.Collections.USER)
          .deleteOne({ _id: mongo_service_1.default.objectId(userId) });
        const summary = {
          events: eventsResponse,
          oauth: oauthResponse,
          user: userResponse,
          errors: [],
        };
        return summary;
      } catch (e) {
        logger.error(e);
        return new errors_base_1.BaseError(
          "Delete User Data Failed",
          JSON.stringify(e),
          500,
          true
        );
      }
    });
  }
}
exports.default = new UserService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlci5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYmFja2VuZC9zcmMvdXNlci9zZXJ2aWNlcy91c2VyLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscURBQWlEO0FBR2pELDBEQUFxRDtBQUNyRCxnRUFBcUQ7QUFDckQsd0dBQWtFO0FBQ2xFLHVFQUFvRTtBQUVwRSxNQUFNLE1BQU0sR0FBRyxJQUFBLHVCQUFNLEVBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUUxQyxNQUFNLFdBQVc7SUFBakI7UUFDRSxlQUFVLEdBQUcsQ0FBTyxRQUE4QixFQUFFLEVBQUU7WUFDcEQsTUFBTSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1lBQ2xDLE1BQU0sV0FBVyxHQUFHLGtCQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2hELGVBQWU7WUFDZixNQUFNLGFBQWEsR0FBRyxNQUFNLHVCQUFZLENBQUMsRUFBRTtpQkFDeEMsVUFBVSxDQUFDLHlCQUFXLENBQUMsSUFBSSxDQUFDO2lCQUM1QixTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7WUFFMUIsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuRCxPQUFPLE1BQU0sQ0FBQztRQUNoQixDQUFDLENBQUEsQ0FBQztJQXVDSixDQUFDO0lBckNDLDBEQUEwRDtJQUNwRCxjQUFjLENBQ2xCLE1BQWM7O1lBRWQsTUFBTSxDQUFDLElBQUksQ0FBQywrQkFBK0IsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUVyRCxJQUFJO2dCQUNGLHFCQUFxQjtnQkFDckIsTUFBTSxjQUFjLEdBQUcsTUFBTSx1QkFBWSxDQUFDLEVBQUU7cUJBQ3pDLFVBQVUsQ0FBQyx5QkFBVyxDQUFDLEtBQUssQ0FBQztxQkFDN0IsVUFBVSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7Z0JBRWhDLE1BQU0sYUFBYSxHQUFHLE1BQU0sdUJBQVksQ0FBQyxFQUFFO3FCQUN4QyxVQUFVLENBQUMseUJBQVcsQ0FBQyxLQUFLLENBQUM7cUJBQzdCLFNBQVMsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO2dCQUUvQixNQUFNLFlBQVksR0FBRyxNQUFNLHVCQUFZLENBQUMsRUFBRTtxQkFDdkMsVUFBVSxDQUFDLHlCQUFXLENBQUMsSUFBSSxDQUFDO3FCQUM1QixTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsdUJBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUVyRCxNQUFNLE9BQU8sR0FBdUI7b0JBQ2xDLE1BQU0sRUFBRSxjQUFjO29CQUN0QixLQUFLLEVBQUUsYUFBYTtvQkFDcEIsSUFBSSxFQUFFLFlBQVk7b0JBQ2xCLE1BQU0sRUFBRSxFQUFFO2lCQUNYLENBQUM7Z0JBQ0YsT0FBTyxPQUFPLENBQUM7YUFDaEI7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDVixNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNoQixPQUFPLElBQUksdUJBQVMsQ0FDbEIseUJBQXlCLEVBQ3pCLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQ2pCLEdBQUcsRUFDSCxJQUFJLENBQ0wsQ0FBQzthQUNIO1FBQ0gsQ0FBQztLQUFBO0NBQ0Y7QUFDRCxrQkFBZSxJQUFJLFdBQVcsRUFBRSxDQUFDIn0=
