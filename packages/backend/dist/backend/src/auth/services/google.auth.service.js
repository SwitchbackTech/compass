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
exports.getGcal = void 0;
const googleapis_1 = require("googleapis");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errors_base_1 = require("@core/errors/errors.base");
const mongo_service_1 = __importDefault(require("@backend/common/services/mongo.service"));
const common_logger_1 = require("@backend/common/logger/common.logger");
const collections_1 = require("@backend/common/constants/collections");
const common_helpers_1 = require("@backend/common/helpers/common.helpers");
const logger = common_logger_1.Logger("app:google.auth.service");
const SCOPES = process.env.SCOPES.split(",");
/********
Helpers
********/
const getGcal = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const oauth = yield mongo_service_1.default.db
        .collection(collections_1.Collections.OAUTH)
        .findOne({ user: userId });
    if (oauth === null) {
        // throwing error forces middleware error handler to address
        // before other bad stuff can happen
        throw new errors_base_1.BaseError("Gcal Auth failed", `No OAUTH record for user: ${userId}`, 500, true);
    }
    const googleClient = new GoogleOauthService();
    yield googleClient.setTokens(null, oauth.tokens);
    const calendar = googleapis_1.google.calendar({
        version: "v3",
        auth: googleClient.oauthClient,
    });
    return calendar;
});
exports.getGcal = getGcal;
class GoogleOauthService {
    constructor() {
        const redirectUri = common_helpers_1.isDev()
            ? process.env.REDIRECT_URI_DEV
            : process.env.REDIRECT_URI;
        this.oauthClient = new googleapis_1.google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET, redirectUri);
        this.tokens = {};
    }
    checkOauthStatus(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const state = req.query.state;
            const oauth = yield mongo_service_1.default.db
                .collection(collections_1.Collections.OAUTH)
                .findOne({ state: state });
            const isComplete = oauth && oauth.user ? true : false;
            if (isComplete) {
                //TODO use other token creation method above
                // Create an access token //
                const accessToken = jsonwebtoken_1.default.sign({ _id: oauth.user }, process.env.ACCESS_TOKEN_SECRET, {
                    algorithm: "HS256",
                    expiresIn: process.env.ACCESS_TOKEN_LIFE,
                });
                return { token: accessToken, isOauthComplete: isComplete };
            }
            return { isOauthComplete: isComplete };
        });
    }
    generateAuthUrl(state) {
        const authUrl = this.oauthClient.generateAuthUrl({
            access_type: "offline",
            prompt: "consent",
            scope: SCOPES,
            state: state,
        });
        return authUrl;
    }
    getUser() {
        return __awaiter(this, void 0, void 0, function* () {
            const oauth2 = googleapis_1.google.oauth2({
                auth: this.oauthClient,
                version: "v2",
            });
            const response = yield oauth2.userinfo.get();
            if (response.status === 200) {
                return response.data;
            }
            else {
                logger.error("Failed to get google oauth user");
                return new errors_base_1.BaseError("Failed to get Google OAuth user", response.toString(), 500, true);
            }
        });
    }
    getTokens() {
        return this.tokens;
    }
    setTokens(code, tokens) {
        return __awaiter(this, void 0, void 0, function* () {
            if (tokens === null) {
                const { tokens } = yield this.oauthClient.getToken(code);
                this.tokens = tokens;
            }
            else {
                this.tokens = tokens;
            }
            this.oauthClient.setCredentials(this.tokens);
            logger.debug("Credentials set");
        });
    }
}
exports.default = GoogleOauthService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ29vZ2xlLmF1dGguc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9hdXRoL3NlcnZpY2VzL2dvb2dsZS5hdXRoLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQW9DO0FBQ3BDLGdFQUErQjtBQUsvQiwwREFBcUQ7QUFFckQsMkZBQWtFO0FBQ2xFLHdFQUE4RDtBQUM5RCx1RUFBb0U7QUFDcEUsMkVBQStEO0FBSS9ELE1BQU0sTUFBTSxHQUFHLHNCQUFNLENBQUMseUJBQXlCLENBQUMsQ0FBQztBQUNqRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7QUFFN0M7O1NBRVM7QUFDRixNQUFNLE9BQU8sR0FBRyxDQUFPLE1BQWMsRUFBc0IsRUFBRTtJQUNsRSxNQUFNLEtBQUssR0FBaUIsTUFBTSx1QkFBWSxDQUFDLEVBQUU7U0FDOUMsVUFBVSxDQUFDLHlCQUFXLENBQUMsS0FBSyxDQUFDO1NBQzdCLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBRTdCLElBQUksS0FBSyxLQUFLLElBQUksRUFBRTtRQUNsQiw0REFBNEQ7UUFDNUQsb0NBQW9DO1FBQ3BDLE1BQU0sSUFBSSx1QkFBUyxDQUNqQixrQkFBa0IsRUFDbEIsNkJBQTZCLE1BQU0sRUFBRSxFQUNyQyxHQUFHLEVBQ0gsSUFBSSxDQUNMLENBQUM7S0FDSDtJQUVELE1BQU0sWUFBWSxHQUFHLElBQUksa0JBQWtCLEVBQUUsQ0FBQztJQUM5QyxNQUFNLFlBQVksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUVqRCxNQUFNLFFBQVEsR0FBRyxtQkFBTSxDQUFDLFFBQVEsQ0FBQztRQUMvQixPQUFPLEVBQUUsSUFBSTtRQUNiLElBQUksRUFBRSxZQUFZLENBQUMsV0FBVztLQUMvQixDQUFDLENBQUM7SUFFSCxPQUFPLFFBQVEsQ0FBQztBQUNsQixDQUFDLENBQUEsQ0FBQztBQXpCVyxRQUFBLE9BQU8sV0F5QmxCO0FBRUYsTUFBTSxrQkFBa0I7SUFJdEI7UUFDRSxNQUFNLFdBQVcsR0FBRyxzQkFBSyxFQUFFO1lBQ3pCLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQjtZQUM5QixDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUM7UUFFN0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLG1CQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQ3JCLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUN6QixXQUFXLENBQ1osQ0FBQztRQUNGLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDO0lBQ25CLENBQUM7SUFFSyxnQkFBZ0IsQ0FBQyxHQUFvQjs7WUFDekMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7WUFFOUIsTUFBTSxLQUFLLEdBQWlCLE1BQU0sdUJBQVksQ0FBQyxFQUFFO2lCQUM5QyxVQUFVLENBQUMseUJBQVcsQ0FBQyxLQUFLLENBQUM7aUJBQzdCLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBRTdCLE1BQU0sVUFBVSxHQUFHLEtBQUssSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUV0RCxJQUFJLFVBQVUsRUFBRTtnQkFDZCw0Q0FBNEM7Z0JBQzVDLDRCQUE0QjtnQkFDNUIsTUFBTSxXQUFXLEdBQUcsc0JBQUcsQ0FBQyxJQUFJLENBQzFCLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsRUFDbkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFDL0I7b0JBQ0UsU0FBUyxFQUFFLE9BQU87b0JBQ2xCLFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQjtpQkFDekMsQ0FDRixDQUFDO2dCQUVGLE9BQU8sRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLGVBQWUsRUFBRSxVQUFVLEVBQUUsQ0FBQzthQUM1RDtZQUNELE9BQU8sRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUFFLENBQUM7UUFDekMsQ0FBQztLQUFBO0lBRUQsZUFBZSxDQUFDLEtBQWE7UUFDM0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUM7WUFDL0MsV0FBVyxFQUFFLFNBQVM7WUFDdEIsTUFBTSxFQUFFLFNBQVM7WUFDakIsS0FBSyxFQUFFLE1BQU07WUFDYixLQUFLLEVBQUUsS0FBSztTQUNiLENBQUMsQ0FBQztRQUNILE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7SUFFSyxPQUFPOztZQUNYLE1BQU0sTUFBTSxHQUFHLG1CQUFNLENBQUMsTUFBTSxDQUFDO2dCQUMzQixJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVc7Z0JBQ3RCLE9BQU8sRUFBRSxJQUFJO2FBQ2QsQ0FBQyxDQUFDO1lBRUgsTUFBTSxRQUFRLEdBQUcsTUFBTSxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBRTdDLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxHQUFHLEVBQUU7Z0JBQzNCLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQzthQUN0QjtpQkFBTTtnQkFDTCxNQUFNLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxDQUFDLENBQUM7Z0JBQ2hELE9BQU8sSUFBSSx1QkFBUyxDQUNsQixpQ0FBaUMsRUFDakMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUNuQixHQUFHLEVBQ0gsSUFBSSxDQUNMLENBQUM7YUFDSDtRQUNILENBQUM7S0FBQTtJQUVELFNBQVM7UUFDUCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDckIsQ0FBQztJQUVLLFNBQVMsQ0FBQyxJQUFZLEVBQUUsTUFBMEI7O1lBQ3RELElBQUksTUFBTSxLQUFLLElBQUksRUFBRTtnQkFDbkIsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3pELElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO2FBQ3RCO2lCQUFNO2dCQUNMLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO2FBQ3RCO1lBRUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzdDLE1BQU0sQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNsQyxDQUFDO0tBQUE7Q0FDRjtBQUVELGtCQUFlLGtCQUFrQixDQUFDIn0=