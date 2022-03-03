"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const jsonwebtoken_1 = (0, tslib_1.__importDefault)(require("jsonwebtoken"));
const crypto_1 = (0, tslib_1.__importDefault)(require("crypto"));
const uuid_1 = require("uuid");
const errors_base_1 = require("@core/errors/errors.base");
const status_codes_1 = require("@core/errors/status.codes");
const core_constants_1 = require("@core/core.constants");
const winston_logger_1 = require("@core/logger/winston.logger");
const google_auth_service_1 = (0, tslib_1.__importDefault)(
  require("../services/google.auth.service")
);
const compass_auth_service_1 = (0, tslib_1.__importDefault)(
  require("../services/compass.auth.service")
);
const login_complete_1 = require("../services/login.complete");
const logger = (0, winston_logger_1.Logger)("app:auth.controller");
const jwtSecret = process.env["JWT_SECRET"];
const tokenExpirationInSeconds = 36000;
// eventually split up for each provider (google, outlook, email+pw)
class AuthController {
  constructor() {
    this.checkOauthStatus = (req, res) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const integration = req.query["integration"];
        if (integration === core_constants_1.Origin.Google) {
          const status =
            yield new google_auth_service_1.default().checkOauthStatus(req);
          res.promise(Promise.resolve(status));
        } else {
          res.promise(
            new errors_base_1.BaseError(
              "Not Supported",
              `${integration} is not supported`,
              status_codes_1.Status.BAD_REQUEST,
              true
            )
          );
        }
      });
    this.getOauthUrl = (req, res) => {
      if (req.query["integration"] === core_constants_1.Origin.Google) {
        const authState = (0, uuid_1.v4)();
        const authUrl = new google_auth_service_1.default().generateAuthUrl(
          authState
        );
        res.promise(Promise.resolve({ authUrl, authState }));
      }
    };
    this.loginAfterOauthSucceeded = (req, res) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const _integration = core_constants_1.Origin.Google;
        if (_integration === core_constants_1.Origin.Google) {
          const query = req.query;
          const gAuthService = new google_auth_service_1.default();
          yield gAuthService.setTokens(query.code, null);
          const gUser = yield gAuthService.getUser();
          // TODO use query.state to start watching for that channel
          // via gcal.service
          const compassLoginData = {
            user: gUser,
            oauth: Object.assign(
              {},
              { state: query.state },
              { tokens: gAuthService.getTokens() }
            ),
          };
          const compassAuthService = new compass_auth_service_1.default();
          const loginResp = yield compassAuthService.loginToCompass(
            compassLoginData
          );
          //TODO validate resp
          res.promise(Promise.resolve(login_complete_1.loginCompleteHtml));
        }
      });
  }
  demoCreateJWT(req, res) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      try {
        const refreshId = req.body.userId + jwtSecret;
        const salt = crypto_1.default.createSecretKey(
          crypto_1.default.randomBytes(16)
        );
        const hash = crypto_1.default
          .createHmac("sha512", salt)
          .update(refreshId)
          .digest("base64");
        req.body.refreshKey = salt.export();
        const token = jsonwebtoken_1.default.sign(req.body, jwtSecret, {
          expiresIn: tokenExpirationInSeconds,
        });
        return res.status(201).send({ accessToken: token, refreshToken: hash });
      } catch (err) {
        logger.error("createJWT error: %O", err);
        return res.status(500).send();
      }
    });
  }
  createJwt(req, res) {
    // we know this will be present thanks to jwt middleware
    const accessToken = req.headers.authorization
      .split("Bearer ")
      .join("")
      .trim();
    const payload = jsonwebtoken_1.default.verify(
      accessToken,
      process.env["ACCESS_TOKEN_SECRET"]
    );
    const newToken = jsonwebtoken_1.default.sign(
      { _id: payload["_id"] },
      process.env["ACCESS_TOKEN_SECRET"],
      {
        algorithm: "HS256",
        expiresIn: process.env["ACCESS_TOKEN_LIFE"],
      }
    );
    res.promise(Promise.resolve({ token: newToken }));
  }
  loginWithPassword(req, res) {
    res.promise(
      new errors_base_1.BaseError(
        "Not Implemented",
        "do this once adding user+pw support",
        500,
        true
      )
    );
  }
}
exports.default = new AuthController();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC5jb250cm9sbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYmFja2VuZC9zcmMvYXV0aC9jb250cm9sbGVycy9hdXRoLmNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsNkVBQStCO0FBQy9CLGlFQUE0QjtBQUM1QiwrQkFBb0M7QUFDcEMsMERBQXFEO0FBQ3JELDREQUFtRDtBQUNuRCx5REFBOEM7QUFDOUMsZ0VBQXFEO0FBT3JELHVHQUFpRTtBQUNqRSx5R0FBa0U7QUFDbEUsK0RBQStEO0FBRS9ELE1BQU0sTUFBTSxHQUFHLElBQUEsdUJBQU0sRUFBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBRTdDLE1BQU0sU0FBUyxHQUF1QixPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ2hFLE1BQU0sd0JBQXdCLEdBQUcsS0FBSyxDQUFDO0FBRXZDLG9FQUFvRTtBQUNwRSxNQUFNLGNBQWM7SUFBcEI7UUF5Q0UscUJBQWdCLEdBQUcsQ0FBTyxHQUFvQixFQUFFLEdBQXFCLEVBQUUsRUFBRTtZQUN2RSxNQUFNLFdBQVcsR0FBVyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ3JELElBQUksV0FBVyxLQUFLLHVCQUFNLENBQUMsTUFBTSxFQUFFO2dCQUNqQyxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksNkJBQWtCLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDcEUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7YUFDdEM7aUJBQU07Z0JBQ0wsR0FBRyxDQUFDLE9BQU8sQ0FDVCxJQUFJLHVCQUFTLENBQ1gsZUFBZSxFQUNmLEdBQUcsV0FBVyxtQkFBbUIsRUFDakMscUJBQU0sQ0FBQyxXQUFXLEVBQ2xCLElBQUksQ0FDTCxDQUNGLENBQUM7YUFDSDtRQUNILENBQUMsQ0FBQSxDQUFDO1FBRUYsZ0JBQVcsR0FBRyxDQUFDLEdBQW9CLEVBQUUsR0FBcUIsRUFBRSxFQUFFO1lBQzVELElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsS0FBSyx1QkFBTSxDQUFDLE1BQU0sRUFBRTtnQkFDOUMsTUFBTSxTQUFTLEdBQUcsSUFBQSxTQUFNLEdBQUUsQ0FBQztnQkFDM0IsTUFBTSxPQUFPLEdBQUcsSUFBSSw2QkFBa0IsRUFBRSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDcEUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUN0RDtRQUNILENBQUMsQ0FBQztRQWFGLDZCQUF3QixHQUFHLENBQ3pCLEdBQW9CLEVBQ3BCLEdBQXFCLEVBQ3JCLEVBQUU7WUFDRixNQUFNLFlBQVksR0FBRyx1QkFBTSxDQUFDLE1BQU0sQ0FBQztZQUNuQyxJQUFJLFlBQVksS0FBSyx1QkFBTSxDQUFDLE1BQU0sRUFBRTtnQkFDbEMsTUFBTSxLQUFLLEdBQXNCLEdBQUcsQ0FBQyxLQUFLLENBQUM7Z0JBRTNDLE1BQU0sWUFBWSxHQUFHLElBQUksNkJBQWtCLEVBQUUsQ0FBQztnQkFDOUMsTUFBTSxZQUFZLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQy9DLE1BQU0sS0FBSyxHQUFlLE1BQU0sWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUV2RCwwREFBMEQ7Z0JBQzFELG1CQUFtQjtnQkFFbkIsTUFBTSxnQkFBZ0IsR0FBeUI7b0JBQzdDLElBQUksRUFBRSxLQUFLO29CQUNYLEtBQUssRUFBRSxNQUFNLENBQUMsTUFBTSxDQUNsQixFQUFFLEVBQ0YsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUN0QixFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FDckM7aUJBQ0YsQ0FBQztnQkFDRixNQUFNLGtCQUFrQixHQUFHLElBQUksOEJBQWtCLEVBQUUsQ0FBQztnQkFDcEQsTUFBTSxTQUFTLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQyxjQUFjLENBQ3ZELGdCQUFnQixDQUNqQixDQUFDO2dCQUNGLG9CQUFvQjtnQkFFcEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLGtDQUFpQixDQUFDLENBQUMsQ0FBQzthQUNqRDtRQUNILENBQUMsQ0FBQSxDQUFDO0lBQ0osQ0FBQztJQTVHTyxhQUFhLENBQUMsR0FBb0IsRUFBRSxHQUFxQjs7WUFDN0QsSUFBSTtnQkFDRixNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUM7Z0JBQzlDLE1BQU0sSUFBSSxHQUFHLGdCQUFNLENBQUMsZUFBZSxDQUFDLGdCQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzVELE1BQU0sSUFBSSxHQUFHLGdCQUFNO3FCQUNoQixVQUFVLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQztxQkFDMUIsTUFBTSxDQUFDLFNBQVMsQ0FBQztxQkFDakIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNwQixHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3BDLE1BQU0sS0FBSyxHQUFHLHNCQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFO29CQUMxQyxTQUFTLEVBQUUsd0JBQXdCO2lCQUNwQyxDQUFDLENBQUM7Z0JBQ0gsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7YUFDekU7WUFBQyxPQUFPLEdBQUcsRUFBRTtnQkFDWixNQUFNLENBQUMsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUN6QyxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7YUFDL0I7UUFDSCxDQUFDO0tBQUE7SUFFRCxTQUFTLENBQUMsR0FBb0IsRUFBRSxHQUFxQjtRQUNuRCx3REFBd0Q7UUFDeEQsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFhO2FBQzFDLEtBQUssQ0FBQyxTQUFTLENBQUM7YUFDaEIsSUFBSSxDQUFDLEVBQUUsQ0FBQzthQUNSLElBQUksRUFBRSxDQUFDO1FBRVYsTUFBTSxPQUFPLEdBQUcsc0JBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO1FBRTVFLE1BQU0sUUFBUSxHQUFHLHNCQUFHLENBQUMsSUFBSSxDQUN2QixFQUFFLEdBQUcsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFDdkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxFQUNsQztZQUNFLFNBQVMsRUFBRSxPQUFPO1lBQ2xCLFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDO1NBQzVDLENBQ0YsQ0FBQztRQUVGLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQTJCRCxpQkFBaUIsQ0FBQyxHQUFvQixFQUFFLEdBQXFCO1FBQzNELEdBQUcsQ0FBQyxPQUFPLENBQ1QsSUFBSSx1QkFBUyxDQUNYLGlCQUFpQixFQUNqQixxQ0FBcUMsRUFDckMsR0FBRyxFQUNILElBQUksQ0FDTCxDQUNGLENBQUM7SUFDSixDQUFDO0NBa0NGO0FBRUQsa0JBQWUsSUFBSSxjQUFjLEVBQUUsQ0FBQyJ9
