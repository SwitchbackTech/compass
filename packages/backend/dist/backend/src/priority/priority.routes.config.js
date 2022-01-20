"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriorityRoutes = void 0;
const jwt_middleware_1 = __importDefault(require("@backend/auth/middleware/jwt.middleware"));
const mongo_validation_middleware_1 = require("@backend/common/middleware/mongo.validation.middleware");
const common_routes_config_1 = require("@backend/common/common.routes.config");
const priority_controller_1 = __importDefault(require("./controllers/priority.controller"));
class PriorityRoutes extends common_routes_config_1.CommonRoutesConfig {
    constructor(app) {
        super(app, "PriorityRoutes");
    }
    configureRoutes() {
        this.app
            .route(`/priority`)
            .all([jwt_middleware_1.default.verifyTokenAndSaveUserId])
            .get(priority_controller_1.default.readAll)
            .post(priority_controller_1.default.create);
        this.app
            .route(`/priority/:id`)
            .all([jwt_middleware_1.default.verifyTokenAndSaveUserId, mongo_validation_middleware_1.validateIds])
            .get(priority_controller_1.default.readById)
            .put(priority_controller_1.default.update)
            .delete(priority_controller_1.default.delete);
        return this.app;
    }
}
exports.PriorityRoutes = PriorityRoutes;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpb3JpdHkucm91dGVzLmNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9wcmlvcml0eS9wcmlvcml0eS5yb3V0ZXMuY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUVBLDZGQUFvRTtBQUNwRSx3R0FBcUY7QUFDckYsK0VBQTBFO0FBRTFFLDRGQUFtRTtBQUVuRSxNQUFhLGNBQWUsU0FBUSx5Q0FBa0I7SUFDcEQsWUFBWSxHQUF3QjtRQUNsQyxLQUFLLENBQUMsR0FBRyxFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVELGVBQWU7UUFDYixJQUFJLENBQUMsR0FBRzthQUNMLEtBQUssQ0FBQyxXQUFXLENBQUM7YUFDbEIsR0FBRyxDQUFDLENBQUMsd0JBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO2FBQzdDLEdBQUcsQ0FBQyw2QkFBa0IsQ0FBQyxPQUFPLENBQUM7YUFDL0IsSUFBSSxDQUFDLDZCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRW5DLElBQUksQ0FBQyxHQUFHO2FBQ0wsS0FBSyxDQUFDLGVBQWUsQ0FBQzthQUN0QixHQUFHLENBQUMsQ0FBQyx3QkFBYSxDQUFDLHdCQUF3QixFQUFFLHlDQUFXLENBQUMsQ0FBQzthQUMxRCxHQUFHLENBQUMsNkJBQWtCLENBQUMsUUFBUSxDQUFDO2FBQ2hDLEdBQUcsQ0FBQyw2QkFBa0IsQ0FBQyxNQUFNLENBQUM7YUFDOUIsTUFBTSxDQUFDLDZCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRXJDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQztJQUNsQixDQUFDO0NBQ0Y7QUFyQkQsd0NBcUJDIn0=