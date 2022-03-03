"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarRoutes = void 0;
const tslib_1 = require("tslib");
const common_routes_config_1 = require("@backend/common/common.routes.config");
const jwt_middleware_1 = (0, tslib_1.__importDefault)(
  require("@backend/auth/middleware/jwt.middleware")
);
const calendar_controller_1 = (0, tslib_1.__importDefault)(
  require("./controllers/calendar.controller")
);
class CalendarRoutes extends common_routes_config_1.CommonRoutesConfig {
  constructor(app) {
    super(app, "CalendarRoutes");
  }
  configureRoutes() {
    this.app
      .route(`/api/calendarlist`)
      .all(jwt_middleware_1.default.verifyTokenAndSaveUserId)
      .get(calendar_controller_1.default.list)
      .post(calendar_controller_1.default.create);
    return this.app;
  }
}
exports.CalendarRoutes = CalendarRoutes;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsZW5kYXIucm91dGVzLmNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3BhY2thZ2VzL2JhY2tlbmQvc3JjL2NhbGVuZGFyL2NhbGVuZGFyLnJvdXRlcy5jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUNBLCtFQUEwRTtBQUMxRSwwR0FBb0U7QUFFcEUseUdBQW1FO0FBRW5FLE1BQWEsY0FBZSxTQUFRLHlDQUFrQjtJQUNwRCxZQUFZLEdBQXdCO1FBQ2xDLEtBQUssQ0FBQyxHQUFHLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztJQUMvQixDQUFDO0lBRUQsZUFBZTtRQUNiLElBQUksQ0FBQyxHQUFHO2FBQ0wsS0FBSyxDQUFDLG1CQUFtQixDQUFDO2FBQzFCLEdBQUcsQ0FBQyx3QkFBYSxDQUFDLHdCQUF3QixDQUFDO2FBQzNDLEdBQUcsQ0FBQyw2QkFBa0IsQ0FBQyxJQUFJLENBQUM7YUFDNUIsSUFBSSxDQUFDLDZCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ25DLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQztJQUNsQixDQUFDO0NBQ0Y7QUFiRCx3Q0FhQyJ9
