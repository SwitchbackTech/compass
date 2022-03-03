"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriorityRoutes = void 0;
const tslib_1 = require("tslib");
const jwt_middleware_1 = (0, tslib_1.__importDefault)(
  require("@backend/auth/middleware/jwt.middleware")
);
const mongo_validation_middleware_1 = require("@backend/common/middleware/mongo.validation.middleware");
const common_routes_config_1 = require("@backend/common/common.routes.config");
const priority_controller_1 = (0, tslib_1.__importDefault)(
  require("./controllers/priority.controller")
);
class PriorityRoutes extends common_routes_config_1.CommonRoutesConfig {
  constructor(app) {
    super(app, "PriorityRoutes");
  }
  configureRoutes() {
    this.app
      .route(`/api/priority`)
      .all([jwt_middleware_1.default.verifyTokenAndSaveUserId])
      .get(priority_controller_1.default.readAll)
      .post(priority_controller_1.default.create);
    this.app
      .route(`/api/priority/:id`)
      .all([
        jwt_middleware_1.default.verifyTokenAndSaveUserId,
        mongo_validation_middleware_1.validateIds,
      ])
      .get(priority_controller_1.default.readById)
      .put(priority_controller_1.default.update)
      .delete(priority_controller_1.default.delete);
    return this.app;
  }
}
exports.PriorityRoutes = PriorityRoutes;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpb3JpdHkucm91dGVzLmNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3BhY2thZ2VzL2JhY2tlbmQvc3JjL3ByaW9yaXR5L3ByaW9yaXR5LnJvdXRlcy5jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUVBLDBHQUFvRTtBQUNwRSx3R0FBcUY7QUFDckYsK0VBQTBFO0FBRTFFLHlHQUFtRTtBQUVuRSxNQUFhLGNBQWUsU0FBUSx5Q0FBa0I7SUFDcEQsWUFBWSxHQUF3QjtRQUNsQyxLQUFLLENBQUMsR0FBRyxFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVELGVBQWU7UUFDYixJQUFJLENBQUMsR0FBRzthQUNMLEtBQUssQ0FBQyxlQUFlLENBQUM7YUFDdEIsR0FBRyxDQUFDLENBQUMsd0JBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO2FBQzdDLEdBQUcsQ0FBQyw2QkFBa0IsQ0FBQyxPQUFPLENBQUM7YUFDL0IsSUFBSSxDQUFDLDZCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRW5DLElBQUksQ0FBQyxHQUFHO2FBQ0wsS0FBSyxDQUFDLG1CQUFtQixDQUFDO2FBQzFCLEdBQUcsQ0FBQyxDQUFDLHdCQUFhLENBQUMsd0JBQXdCLEVBQUUseUNBQVcsQ0FBQyxDQUFDO2FBQzFELEdBQUcsQ0FBQyw2QkFBa0IsQ0FBQyxRQUFRLENBQUM7YUFDaEMsR0FBRyxDQUFDLDZCQUFrQixDQUFDLE1BQU0sQ0FBQzthQUM5QixNQUFNLENBQUMsNkJBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFckMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDO0lBQ2xCLENBQUM7Q0FDRjtBQXJCRCx3Q0FxQkMifQ==
