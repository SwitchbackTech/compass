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
const errors_base_1 = require("@core/errors/errors.base");
const common_logger_1 = require("@backend/common/logger/common.logger");
const mongo_service_1 = __importDefault(require("@backend/common/services/mongo.service"));
const collections_1 = require("@backend/common/constants/collections");
const logger = common_logger_1.Logger("app:user.service");
// Map  user object given by google signin to our schema //
const mapToCompassUser = (userData) => {
    return {
        email: userData.user.email,
        name: userData.user.name,
        picture: userData.user.picture,
        googleId: userData.user.id,
    };
};
class UserService {
    constructor() {
        this.createUser = (userData) => __awaiter(this, void 0, void 0, function* () {
            logger.debug("Creating new user");
            const compassUser = mapToCompassUser(userData);
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
        return __awaiter(this, void 0, void 0, function* () {
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
            }
            catch (e) {
                logger.error(e);
                return new errors_base_1.BaseError("Delete User Data Failed", e, 500, true);
            }
        });
    }
}
exports.default = new UserService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlci5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL3VzZXIvc2VydmljZXMvdXNlci5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBRUEsMERBQXFEO0FBRXJELHdFQUE4RDtBQUM5RCwyRkFBa0U7QUFDbEUsdUVBQW9FO0FBRXBFLE1BQU0sTUFBTSxHQUFHLHNCQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUUxQywyREFBMkQ7QUFDM0QsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLFFBQThCLEVBQWUsRUFBRTtJQUN2RSxPQUFPO1FBQ0wsS0FBSyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSztRQUMxQixJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJO1FBQ3hCLE9BQU8sRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU87UUFDOUIsUUFBUSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtLQUMzQixDQUFDO0FBQ0osQ0FBQyxDQUFDO0FBRUYsTUFBTSxXQUFXO0lBQWpCO1FBQ0UsZUFBVSxHQUFHLENBQU8sUUFBOEIsRUFBRSxFQUFFO1lBQ3BELE1BQU0sQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQztZQUNsQyxNQUFNLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMvQyxlQUFlO1lBQ2YsTUFBTSxhQUFhLEdBQUcsTUFBTSx1QkFBWSxDQUFDLEVBQUU7aUJBQ3hDLFVBQVUsQ0FBQyx5QkFBVyxDQUFDLElBQUksQ0FBQztpQkFDNUIsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBRTFCLE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDbkQsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQyxDQUFBLENBQUM7SUFrQ0osQ0FBQztJQWhDQywwREFBMEQ7SUFDcEQsY0FBYyxDQUNsQixNQUFjOztZQUVkLE1BQU0sQ0FBQyxJQUFJLENBQUMsK0JBQStCLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFFckQsSUFBSTtnQkFDRixxQkFBcUI7Z0JBQ3JCLE1BQU0sY0FBYyxHQUFHLE1BQU0sdUJBQVksQ0FBQyxFQUFFO3FCQUN6QyxVQUFVLENBQUMseUJBQVcsQ0FBQyxLQUFLLENBQUM7cUJBQzdCLFVBQVUsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO2dCQUVoQyxNQUFNLGFBQWEsR0FBRyxNQUFNLHVCQUFZLENBQUMsRUFBRTtxQkFDeEMsVUFBVSxDQUFDLHlCQUFXLENBQUMsS0FBSyxDQUFDO3FCQUM3QixTQUFTLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztnQkFFL0IsTUFBTSxZQUFZLEdBQUcsTUFBTSx1QkFBWSxDQUFDLEVBQUU7cUJBQ3ZDLFVBQVUsQ0FBQyx5QkFBVyxDQUFDLElBQUksQ0FBQztxQkFDNUIsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLHVCQUFZLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFFckQsTUFBTSxPQUFPLEdBQXVCO29CQUNsQyxNQUFNLEVBQUUsY0FBYztvQkFDdEIsS0FBSyxFQUFFLGFBQWE7b0JBQ3BCLElBQUksRUFBRSxZQUFZO29CQUNsQixNQUFNLEVBQUUsRUFBRTtpQkFDWCxDQUFDO2dCQUNGLE9BQU8sT0FBTyxDQUFDO2FBQ2hCO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1YsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDaEIsT0FBTyxJQUFJLHVCQUFTLENBQUMseUJBQXlCLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQzthQUMvRDtRQUNILENBQUM7S0FBQTtDQUNGO0FBQ0Qsa0JBQWUsSUFBSSxXQUFXLEVBQUUsQ0FBQyJ9