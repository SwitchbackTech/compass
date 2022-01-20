"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarRoutes = void 0;
const common_routes_config_1 = require("@backend/common/common.routes.config");
const jwt_middleware_1 = __importDefault(require("@backend/auth/middleware/jwt.middleware"));
const calendar_controller_1 = __importDefault(require("./controllers/calendar.controller"));
class CalendarRoutes extends common_routes_config_1.CommonRoutesConfig {
    constructor(app) {
        super(app, "CalendarRoutes");
    }
    configureRoutes() {
        this.app
            .route(`/calendarlist`)
            .all(jwt_middleware_1.default.verifyTokenAndSaveUserId)
            .get(calendar_controller_1.default.list)
            .post(calendar_controller_1.default.create);
        return this.app;
    }
}
exports.CalendarRoutes = CalendarRoutes;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsZW5kYXIucm91dGVzLmNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9jYWxlbmRhci9jYWxlbmRhci5yb3V0ZXMuY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUVBLCtFQUEwRTtBQUMxRSw2RkFBb0U7QUFFcEUsNEZBQW1FO0FBRW5FLE1BQWEsY0FBZSxTQUFRLHlDQUFrQjtJQUNwRCxZQUFZLEdBQXdCO1FBQ2xDLEtBQUssQ0FBQyxHQUFHLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztJQUMvQixDQUFDO0lBRUQsZUFBZTtRQUNiLElBQUksQ0FBQyxHQUFHO2FBQ0wsS0FBSyxDQUFDLGVBQWUsQ0FBQzthQUN0QixHQUFHLENBQUMsd0JBQWEsQ0FBQyx3QkFBd0IsQ0FBQzthQUMzQyxHQUFHLENBQUMsNkJBQWtCLENBQUMsSUFBSSxDQUFDO2FBQzVCLElBQUksQ0FBQyw2QkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNuQyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUM7SUFDbEIsQ0FBQztDQUNGO0FBYkQsd0NBYUMifQ==