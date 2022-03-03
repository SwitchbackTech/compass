"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGcal = void 0;
const tslib_1 = require("tslib");
const googleapis_1 = require("googleapis");
const jsonwebtoken_1 = (0, tslib_1.__importDefault)(require("jsonwebtoken"));
const errors_base_1 = require("@core/errors/errors.base");
const winston_logger_1 = require("@core/logger/winston.logger");
const mongo_service_1 = (0, tslib_1.__importDefault)(
  require("@backend/common/services/mongo.service")
);
const collections_1 = require("@backend/common/constants/collections");
const common_helpers_1 = require("@backend/common/helpers/common.helpers");
const env_constants_1 = require("@backend/common/constants/env.constants");
const logger = (0, winston_logger_1.Logger)("app:google.auth.service");
/********
Helpers
********/
const getGcal = (userId) =>
  (0, tslib_1.__awaiter)(void 0, void 0, void 0, function* () {
    //@ts-ignore
    const oauth = yield mongo_service_1.default.db
      .collection(collections_1.Collections.OAUTH)
      .findOne({ user: userId });
    if (oauth === null) {
      // throwing error forces middleware error handler to address
      // before other bad stuff can happen
      throw new errors_base_1.BaseError(
        "Gcal Auth failed",
        `No OAUTH record for user: ${userId}`,
        500,
        true
      );
    }
    const googleClient = new GoogleOauthService();
    //@ts-ignore
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
    const redirectUri = (0, common_helpers_1.isDev)()
      ? `http://localhost:${env_constants_1.ENV.PORT}/api/auth/oauth-complete`
      : `${env_constants_1.ENV.BASEURL_PROD}/api/auth/oauth-complete`;
    this.oauthClient = new googleapis_1.google.auth.OAuth2(
      env_constants_1.ENV.CLIENT_ID,
      env_constants_1.ENV.CLIENT_SECRET,
      redirectUri
    );
    this.tokens = {};
  }
  checkOauthStatus(req) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      const state = req.query["state"];
      //@ts-ignore
      const oauth = yield mongo_service_1.default.db
        .collection(collections_1.Collections.OAUTH)
        .findOne({ state: state });
      const isComplete = oauth && oauth.user ? true : false;
      if (isComplete) {
        //TODO use other token creation method above
        // Create an access token //
        const accessToken = jsonwebtoken_1.default.sign(
          { _id: oauth.user },
          env_constants_1.ENV.ACCESS_TOKEN_SECRET,
          {
            algorithm: "HS256",
            expiresIn: env_constants_1.ENV.ACCESS_TOKEN_LIFE,
          }
        );
        return { token: accessToken, isOauthComplete: isComplete };
      }
      return { isOauthComplete: isComplete };
    });
  }
  generateAuthUrl(state) {
    const authUrl = this.oauthClient.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: env_constants_1.ENV.SCOPES,
      state: state,
    });
    return authUrl;
  }
  getUser() {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      const oauth2 = googleapis_1.google.oauth2({
        auth: this.oauthClient,
        version: "v2",
      });
      const response = yield oauth2.userinfo.get();
      if (response.status === 200) {
        return response.data;
      } else {
        logger.error("Failed to get google oauth user");
        return new errors_base_1.BaseError(
          "Failed to get Google OAuth user",
          response.toString(),
          500,
          true
        );
      }
    });
  }
  getTokens() {
    return this.tokens;
  }
  setTokens(code, tokens) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      if (tokens === null) {
        const { tokens } = yield this.oauthClient.getToken(code);
        this.tokens = tokens;
      } else {
        this.tokens = tokens;
      }
      this.oauthClient.setCredentials(this.tokens);
      logger.debug("Credentials set");
    });
  }
}
exports.default = GoogleOauthService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ29vZ2xlLmF1dGguc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2JhY2tlbmQvc3JjL2F1dGgvc2VydmljZXMvZ29vZ2xlLmF1dGguc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsMkNBQW9DO0FBQ3BDLDZFQUErQjtBQUkvQiwwREFBcUQ7QUFFckQsZ0VBQXFEO0FBQ3JELHdHQUFrRTtBQUNsRSx1RUFBb0U7QUFDcEUsMkVBQStEO0FBQy9ELDJFQUE4RDtBQUU5RCxNQUFNLE1BQU0sR0FBRyxJQUFBLHVCQUFNLEVBQUMseUJBQXlCLENBQUMsQ0FBQztBQUVqRDs7U0FFUztBQUNGLE1BQU0sT0FBTyxHQUFHLENBQU8sTUFBYyxFQUFzQixFQUFFO0lBQ2xFLFlBQVk7SUFDWixNQUFNLEtBQUssR0FBaUIsTUFBTSx1QkFBWSxDQUFDLEVBQUU7U0FDOUMsVUFBVSxDQUFDLHlCQUFXLENBQUMsS0FBSyxDQUFDO1NBQzdCLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBRTdCLElBQUksS0FBSyxLQUFLLElBQUksRUFBRTtRQUNsQiw0REFBNEQ7UUFDNUQsb0NBQW9DO1FBQ3BDLE1BQU0sSUFBSSx1QkFBUyxDQUNqQixrQkFBa0IsRUFDbEIsNkJBQTZCLE1BQU0sRUFBRSxFQUNyQyxHQUFHLEVBQ0gsSUFBSSxDQUNMLENBQUM7S0FDSDtJQUVELE1BQU0sWUFBWSxHQUFHLElBQUksa0JBQWtCLEVBQUUsQ0FBQztJQUM5QyxZQUFZO0lBQ1osTUFBTSxZQUFZLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFakQsTUFBTSxRQUFRLEdBQUcsbUJBQU0sQ0FBQyxRQUFRLENBQUM7UUFDL0IsT0FBTyxFQUFFLElBQUk7UUFDYixJQUFJLEVBQUUsWUFBWSxDQUFDLFdBQVc7S0FDL0IsQ0FBQyxD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
