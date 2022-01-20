"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRoutes = void 0;
// import { body } from "express-validator";
const common_routes_config_1 = require("@backend/common/common.routes.config");
const auth_controller_1 = __importDefault(require("./controllers/auth.controller"));
const jwt_middleware_1 = __importDefault(require("./middleware/jwt.middleware"));
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
        this.app.get(`/auth/oauth-url`, [auth_controller_1.default.getOauthUrl]);
        this.app.get(`/auth/oauth-status`, [
            // TODO validate that required integration query is present first
            // or replace query with params (oauth/google)
            auth_controller_1.default.checkOauthStatus,
        ]);
        // Called by Google after successful oauth
        this.app.get(`/auth/oauth-complete`, [
            auth_controller_1.default.loginAfterOauthSucceeded,
        ]);
        this.app.post(`/auth/refresh-token`, [
            jwt_middleware_1.default.verifyTokenAndSaveUserId,
            auth_controller_1.default.createJwt,
        ]);
        return this.app;
    }
}
exports.AuthRoutes = AuthRoutes;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC5yb3V0ZXMuY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2F1dGgvYXV0aC5yb3V0ZXMuY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUNBLDRDQUE0QztBQUU1QywrRUFBMEU7QUFFMUUsb0ZBQTJEO0FBQzNELGlGQUF3RDtBQUN4RCw2REFBNkQ7QUFDN0QsMEZBQTBGO0FBRTFGLE1BQWEsVUFBVyxTQUFRLHlDQUFrQjtJQUNoRCxZQUFZLEdBQXdCO1FBQ2xDLEtBQUssQ0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDM0IsQ0FBQztJQUVELGVBQWU7UUFDYjs7VUFFRTtRQUVGLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRTtZQUM3QiwyQkFBMkI7WUFDM0IsK0JBQStCO1lBQy9CLG1EQUFtRDtZQUNuRCxxQ0FBcUM7WUFDckMsZ0NBQWdDO1lBQ2hDLHlCQUFjLENBQUMsaUJBQWlCO1NBQ2pDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLDBCQUEwQixFQUFFO1lBQ3hDLGFBQWE7WUFDYix3QkFBYSxDQUFDLGNBQWM7WUFDNUIsd0JBQWEsQ0FBQyxzQkFBc0I7WUFDcEMsd0JBQWEsQ0FBQyxrQkFBa0I7WUFDaEMseUJBQWMsQ0FBQyxhQUFhO1NBQzdCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLENBQUMseUJBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQzlELElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLG9CQUFvQixFQUFFO1lBQ2pDLGlFQUFpRTtZQUNqRSw4Q0FBOEM7WUFDOUMseUJBQWMsQ0FBQyxnQkFBZ0I7U0FDaEMsQ0FBQyxDQUFDO1FBQ0gsMENBQTBDO1FBQzFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFO1lBQ25DLHlCQUFjLENBQUMsd0JBQXdCO1NBQ3hDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFO1lBQ25DLHdCQUFhLENBQUMsd0JBQXdCO1lBQ3RDLHlCQUFjLENBQUMsU0FBUztTQUN6QixDQUFDLENBQUM7UUFDSCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUM7SUFDbEIsQ0FBQztDQUNGO0FBMUNELGdDQTBDQyJ9