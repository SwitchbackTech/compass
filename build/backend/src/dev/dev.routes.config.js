"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevRoutes = void 0;
const tslib_1 = require("tslib");
const common_routes_config_1 = require("@backend/common/common.routes.config");
const jwt_middleware_1 = (0, tslib_1.__importDefault)(
  require("@backend/auth/middleware/jwt.middleware")
);
const dev_controller_1 = (0, tslib_1.__importDefault)(
  require("./controllers/dev.controller")
);
class DevRoutes extends common_routes_config_1.CommonRoutesConfig {
  constructor(app) {
    super(app, "DevRoutes");
  }
  configureRoutes() {
    this.app
      .route(`/dev/sync/stop/:userId`)
      .all(jwt_middleware_1.default.verifyTokenAndSaveUserId)
      .post(dev_controller_1.default.stopAllChannelWatches);
    return this.app;
  }
}
exports.DevRoutes = DevRoutes;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2LnJvdXRlcy5jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wYWNrYWdlcy9iYWNrZW5kL3NyYy9kZXYvZGV2LnJvdXRlcy5jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUNBLCtFQUEwRTtBQUMxRSwwR0FBb0U7QUFFcEUsK0ZBQXlEO0FBRXpELE1BQWEsU0FBVSxTQUFRLHlDQUFrQjtJQUMvQyxZQUFZLEdBQXdCO1FBQ2xDLEtBQUssQ0FBQyxHQUFHLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUVELGVBQWU7UUFDYixJQUFJLENBQUMsR0FBRzthQUNMLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQzthQUMvQixHQUFHLENBQUMsd0JBQWEsQ0FBQyx3QkFBd0IsQ0FBQzthQUMzQyxJQUFJLENBQUMsd0JBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBRTdDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQztJQUNsQixDQUFDO0NBQ0Y7QUFiRCw4QkFhQyJ9
