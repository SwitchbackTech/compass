"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventRoutes = void 0;
const tslib_1 = require("tslib");
const common_routes_config_1 = require("@backend/common/common.routes.config");
const jwt_middleware_1 = (0, tslib_1.__importDefault)(
  require("@backend/auth/middleware/jwt.middleware")
);
const event_controller_1 = (0, tslib_1.__importDefault)(
  require("./controllers/event.controller")
);
class EventRoutes extends common_routes_config_1.CommonRoutesConfig {
  constructor(app) {
    super(app, "EventRoutes");
  }
  configureRoutes() {
    this.app
      .route(`/api/event`)
      .all(jwt_middleware_1.default.verifyTokenAndSaveUserId)
      .get(event_controller_1.default.readAll)
      .post(event_controller_1.default.create);
    this.app
      .route(`/api/event/updateMany`)
      .all(jwt_middleware_1.default.verifyTokenAndSaveUserId)
      .post(event_controller_1.default.updateMany);
    this.app
      .route(`/api/event/deleteMany`)
      .all(jwt_middleware_1.default.verifyTokenAndSaveUserId)
      .delete(event_controller_1.default.deleteMany);
    this.app
      .route(`/api/event/import`)
      .all(jwt_middleware_1.default.verifyTokenAndSaveUserId)
      .post(event_controller_1.default.import);
    this.app
      .route(`/api/event/:id`)
      .all(jwt_middleware_1.default.verifyTokenAndSaveUserId)
      .get(event_controller_1.default.readById)
      .put(event_controller_1.default.update)
      .delete(event_controller_1.default.delete);
    return this.app;
  }
}
exports.EventRoutes = EventRoutes;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQucm91dGVzLmNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3BhY2thZ2VzL2JhY2tlbmQvc3JjL2V2ZW50L2V2ZW50LnJvdXRlcy5jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUVBLCtFQUEwRTtBQUMxRSwwR0FBb0U7QUFFcEUsbUdBQTZEO0FBRTdELE1BQWEsV0FBWSxTQUFRLHlDQUFrQjtJQUNqRCxZQUFZLEdBQXdCO1FBQ2xDLEtBQUssQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDNUIsQ0FBQztJQUVELGVBQWU7UUFDYixJQUFJLENBQUMsR0FBRzthQUNMLEtBQUssQ0FBQyxZQUFZLENBQUM7YUFDbkIsR0FBRyxDQUFDLHdCQUFhLENBQUMsd0JBQXdCLENBQUM7YUFDM0MsR0FBRyxDQUFDLDBCQUFlLENBQUMsT0FBTyxDQUFDO2FBQzVCLElBQUksQ0FBQywwQkFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRWhDLElBQUksQ0FBQyxHQUFHO2FBQ0wsS0FBSyxDQUFDLHVCQUF1QixDQUFDO2FBQzlCLEdBQUcsQ0FBQyx3QkFBYSxDQUFDLHdCQUF3QixDQUFDO2FBQzNDLElBQUksQ0FBQywwQkFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXBDLElBQUksQ0FBQyxHQUFHO2FBQ0wsS0FBSyxDQUFDLHVCQUF1QixDQUFDO2FBQzlCLEdBQUcsQ0FBQyx3QkFBYSxDQUFDLHdCQUF3QixDQUFDO2FBQzNDLE1BQU0sQ0FBQywwQkFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXRDLElBQUksQ0FBQyxHQUFHO2FBQ0wsS0FBSyxDQUFDLG1CQUFtQixDQUFDO2FBQzFCLEdBQUcsQ0FBQyx3QkFBYSxDQUFDLHdCQUF3QixDQUFDO2FBQzNDLElBQUksQ0FBQywwQkFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRWhDLElBQUksQ0FBQyxHQUFHO2FBQ0wsS0FBSyxDQUFDLGdCQUFnQixDQUFDO2FBQ3ZCLEdBQUcsQ0FBQyx3QkFBYSxDQUFDLHdCQUF3QixDQUFDO2FBQzNDLEdBQUcsQ0FBQywwQkFBZSxDQUFDLFFBQVEsQ0FBQzthQUM3QixHQUFHLENBQUMsMEJBQWUsQ0FBQyxNQUFNLENBQUM7YUFDM0IsTUFBTSxDQUFDLDBCQUFlLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbEMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDO0lBQ2xCLENBQUM7Q0FDRjtBQW5DRCxrQ0FtQ0MifQ==
