"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_logger_1 = require("@backend/common/logger/common.logger");
const collections_1 = require("@backend/common/constants/collections");
const mongo_service_1 = __importDefault(require("@backend/common/services/mongo.service"));
const user_service_1 = __importDefault(require("@backend/user/services/user.service"));
const logger = common_logger_1.Logger("app:compass.auth.service");
class CompassAuthService {
    loginToCompass(loginData) {
        return __awaiter(this, void 0, void 0, function* () {
            // use googleId to check if user exists in Compass' DB
            const compassUser = yield mongo_service_1.default.db
                .collection(collections_1.Collections.USER)
                .findOne({ googleId: loginData.user.id });
            let compassUserId;
            if (compassUser) {
                compassUserId = compassUser._id.toString();
            }
            else {
                compassUserId = yield user_service_1.default.createUser(loginData);
            }
            const updateOauthRes = yield this.updateOauthId(compassUserId, loginData);
            return updateOauthRes;
        });
    }
    updateOauthId(userId, userData) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.debug(`Setting oauth data for compass user: ${userId}`);
            const updatedOauthUser = Object.assign({}, userData.oauth, {
                user: userId,
            });
            // await validate(OAUTH, updatedOauth); //TODO
            const response = yield mongo_service_1.default.db
                .collection(collections_1.Collections.OAUTH)
                .findOneAndUpdate({ user: updatedOauthUser.user }, { $set: updatedOauthUser }, { upsert: true, returnDocument: "after" });
            const updatedOAuth = response.value;
            return updatedOAuth;
        });
    }
}
exports.default = CompassAuthService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGFzcy5hdXRoLnNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvYXV0aC9zZXJ2aWNlcy9jb21wYXNzLmF1dGguc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUVBLHdFQUE4RDtBQUM5RCx1RUFBb0U7QUFDcEUsMkZBQWtFO0FBQ2xFLHVGQUE4RDtBQUU5RCxNQUFNLE1BQU0sR0FBRyxzQkFBTSxDQUFDLDBCQUEwQixDQUFDLENBQUM7QUFFbEQsTUFBTSxrQkFBa0I7SUFDaEIsY0FBYyxDQUFDLFNBQStCOztZQUNsRCxzREFBc0Q7WUFDdEQsTUFBTSxXQUFXLEdBQUcsTUFBTSx1QkFBWSxDQUFDLEVBQUU7aUJBQ3RDLFVBQVUsQ0FBQyx5QkFBVyxDQUFDLElBQUksQ0FBQztpQkFDNUIsT0FBTyxDQUFDLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUU1QyxJQUFJLGFBQXFCLENBQUM7WUFDMUIsSUFBSSxXQUFXLEVBQUU7Z0JBQ2YsYUFBYSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7YUFDNUM7aUJBQU07Z0JBQ0wsYUFBYSxHQUFHLE1BQU0sc0JBQVcsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7YUFDekQ7WUFFRCxNQUFNLGNBQWMsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzFFLE9BQU8sY0FBYyxDQUFDO1FBQ3hCLENBQUM7S0FBQTtJQUVLLGFBQWEsQ0FDakIsTUFBYyxFQUNkLFFBQThCOztZQUU5QixNQUFNLENBQUMsS0FBSyxDQUFDLHdDQUF3QyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBRS9ELE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLEtBQUssRUFBRTtnQkFDekQsSUFBSSxFQUFFLE1BQU07YUFDYixDQUFDLENBQUM7WUFDSCw4Q0FBOEM7WUFFOUMsTUFBTSxRQUFRLEdBQUcsTUFBTSx1QkFBWSxDQUFDLEVBQUU7aUJBQ25DLFVBQVUsQ0FBQyx5QkFBVyxDQUFDLEtBQUssQ0FBQztpQkFDN0IsZ0JBQWdCLENBQ2YsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLEVBQy9CLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLEVBQzFCLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsT0FBTyxFQUFFLENBQzFDLENBQUM7WUFDSixNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDO1lBRXBDLE9BQU8sWUFBNEIsQ0FBQztRQUN0QyxDQUFDO0tBQUE7Q0FDRjtBQUVELGtCQUFlLGtCQUFrQixDQUFDIn0=