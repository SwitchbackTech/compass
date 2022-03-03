"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRoutes = void 0;
const tslib_1 = require("tslib");
const common_routes_config_1 = require("@backend/common/common.routes.config");
const auth_controller_1 = (0, tslib_1.__importDefault)(
  require("./controllers/auth.controller")
);
const jwt_middleware_1 = (0, tslib_1.__importDefault)(
  require("./middleware/jwt.middleware")
);
// import authMiddleware from "./middleware/auth.middleware";
// import BodyValidationMiddleware from "../common/middleware/body.validation.middleware";
class AuthRoutes extends common_routes_config_1.CommonRoutesConfig {
  constructor(app) {
    super(app, "AuthRoutes");
  }
  configureRoutes() {
    /*
        demo code from template. update or delete
        */
    this.app.post(`/demo-auth/pw`, [
      // body("email").isEmail(),
      // body("password").isString(),
      // BodyValidationMiddleware.verifyBodyFieldsErrors,
      // authMiddleware.verifyUserPassword,
      // authController.demoCreateJWT,
      auth_controller_1.default.loginWithPassword,
    ]);
    this.app.post(`/demo-auth/refresh-token`, [
      //TODO update
      jwt_middleware_1.default.validJWTNeeded,
      jwt_middleware_1.default.verifyRefreshBodyField,
      jwt_middleware_1.default.validRefreshNeeded,
      auth_controller_1.default.demoCreateJWT,
    ]);
    this.app.get(`/api/auth/oauth-url`, [
      auth_controller_1.default.getOauthUrl,
    ]);
    this.app.get(`/api/auth/oauth-status`, [
      // TODO validate that required integration query is present first
      // or replace query with params (oauth/google)
      auth_controller_1.default.checkOauthStatus,
    ]);
    // Called by Google after successful oauth
    this.app.get(`/api/auth/oauth-complete`, [
      auth_controller_1.default.loginAfterOauthSucceeded,
    ]);
    this.app.post(`/api/auth/refresh-token`, [
      jwt_middleware_1.default.verifyTokenAndSaveUserId,
      auth_controller_1.default.createJwt,
    ]);
    return this.app;
  }
}
exports.AuthRoutes = AuthRoutes;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC5yb3V0ZXMuY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vcGFja2FnZXMvYmFja2VuZC9zcmMvYXV0aC9hdXRoLnJvdXRlcy5jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUNBLCtFQUEwRTtBQUUxRSxpR0FBMkQ7QUFDM0QsOEZBQXdEO0FBQ3hELDZEQUE2RDtBQUM3RCwwRkFBMEY7QUFFMUYsTUFBYSxVQUFXLFNBQVEseUNBQWtCO0lBQ2hELFlBQVksR0FBd0I7UUFDbEMsS0FBSyxDQUFDLEdBQUcsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUMzQixDQUFDO0lBRUQsZUFBZTtRQUNiOztVQUVFO1FBRUYsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFO1lBQzdCLDJCQUEyQjtZQUMzQiwrQkFBK0I7WUFDL0IsbURBQW1EO1lBQ25ELHFDQUFxQztZQUNyQyxnQ0FBZ0M7WUFDaEMseUJBQWMsQ0FBQyxpQkFBaUI7U0FDakMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLEVBQUU7WUFDeEMsYUFBYTtZQUNiLHdCQUFhLENBQUMsY0FBYztZQUM1Qix3QkFBYSxDQUFDLHNCQUFzQjtZQUNwQyx3QkFBYSxDQUFDLGtCQUFrQjtZQUNoQyx5QkFBYyxDQUFDLGFBQWE7U0FDN0IsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsQ0FBQyx5QkFBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDbEUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEVBQUU7WUFDckMsaUVBQWlFO1lBQ2pFLDhDQUE4QztZQUM5Qyx5QkFBYyxDQUFDLGdCQUFnQjtTQUNoQyxDQUFDLENBQUM7UUFDSCwwQ0FBMEM7UUFDMUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEVBQUU7WUFDdkMseUJBQWMsQ0FBQyx3QkFBd0I7U0FDeEMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMseUJBQXlCLEVBQUU7WUFDdkMsd0JBQWEsQ0FBQyx3QkFBd0I7WUFDdEMseUJBQWMsQ0FBQyxTQUFTO1NBQ3pCLENBQUMsQ0FBQztRQUNILE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQztJQUNsQixDQUFDO0NBQ0Y7QUExQ0QsZ0NBMENDIn0=
