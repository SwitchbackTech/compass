"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventRoutes = void 0;
const common_routes_config_1 = require("@backend/common/common.routes.config");
const jwt_middleware_1 = __importDefault(require("@backend/auth/middleware/jwt.middleware"));
const event_controller_1 = __importDefault(require("./controllers/event.controller"));
class EventRoutes extends common_routes_config_1.CommonRoutesConfig {
    constructor(app) {
        super(app, "EventRoutes");
    }
    configureRoutes() {
        this.app
            .route(`/event`)
            .all(jwt_middleware_1.default.verifyTokenAndSaveUserId)
            .get(event_controller_1.default.readAll)
            .post(event_controller_1.default.create);
        this.app
            .route(`/event/updateMany`)
            .all(jwt_middleware_1.default.verifyTokenAndSaveUserId)
            .post(event_controller_1.default.updateMany);
        this.app
            .route(`/event/deleteMany`)
            .all(jwt_middleware_1.default.verifyTokenAndSaveUserId)
            .delete(event_controller_1.default.deleteMany);
        this.app
            .route(`/event/import`)
            .all(jwt_middleware_1.default.verifyTokenAndSaveUserId)
            .post(event_controller_1.default.import);
        this.app
            .route(`/event/:id`)
            .all(jwt_middleware_1.default.verifyTokenAndSaveUserId)
            .get(event_controller_1.default.readById)
            .put(event_controller_1.default.update)
            .delete(event_controller_1.default.delete);
        return this.app;
    }
}
exports.EventRoutes = EventRoutes;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQucm91dGVzLmNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9ldmVudC9ldmVudC5yb3V0ZXMuY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUVBLCtFQUEwRTtBQUMxRSw2RkFBb0U7QUFFcEUsc0ZBQTZEO0FBRTdELE1BQWEsV0FBWSxTQUFRLHlDQUFrQjtJQUNqRCxZQUFZLEdBQXdCO1FBQ2xDLEtBQUssQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDNUIsQ0FBQztJQUVELGVBQWU7UUFDYixJQUFJLENBQUMsR0FBRzthQUNMLEtBQUssQ0FBQyxRQUFRLENBQUM7YUFDZixHQUFHLENBQUMsd0JBQWEsQ0FBQyx3QkFBd0IsQ0FBQzthQUMzQyxHQUFHLENBQUMsMEJBQWUsQ0FBQyxPQUFPLENBQUM7YUFDNUIsSUFBSSxDQUFDLDBCQUFlLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFaEMsSUFBSSxDQUFDLEdBQUc7YUFDTCxLQUFLLENBQUMsbUJBQW1CLENBQUM7YUFDMUIsR0FBRyxDQUFDLHdCQUFhLENBQUMsd0JBQXdCLENBQUM7YUFDM0MsSUFBSSxDQUFDLDBCQUFlLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFcEMsSUFBSSxDQUFDLEdBQUc7YUFDTCxLQUFLLENBQUMsbUJBQW1CLENBQUM7YUFDMUIsR0FBRyxDQUFDLHdCQUFhLENBQUMsd0JBQXdCLENBQUM7YUFDM0MsTUFBTSxDQUFDLDBCQUFlLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFdEMsSUFBSSxDQUFDLEdBQUc7YUFDTCxLQUFLLENBQUMsZUFBZSxDQUFDO2FBQ3RCLEdBQUcsQ0FBQyx3QkFBYSxDQUFDLHdCQUF3QixDQUFDO2FBQzNDLElBQUksQ0FBQywwQkFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRWhDLElBQUksQ0FBQyxHQUFHO2FBQ0wsS0FBSyxDQUFDLFlBQVksQ0FBQzthQUNuQixHQUFHLENBQUMsd0JBQWEsQ0FBQyx3QkFBd0IsQ0FBQzthQUMzQyxHQUFHLENBQUMsMEJBQWUsQ0FBQyxRQUFRLENBQUM7YUFDN0IsR0FBRyxDQUFDLDBCQUFlLENBQUMsTUFBTSxDQUFDO2FBQzNCLE1BQU0sQ0FBQywwQkFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQztJQUNsQixDQUFDO0NBQ0Y7QUFuQ0Qsa0NBbUNDIn0=