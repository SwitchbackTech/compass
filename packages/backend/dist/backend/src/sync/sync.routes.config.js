"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncRoutes = void 0;
const common_routes_config_1 = require("@backend/common/common.routes.config");
const backend_constants_1 = require("@backend/common/constants/backend.constants");
const jwt_middleware_1 = __importDefault(require("@backend/auth/middleware/jwt.middleware"));
const sync_gcal_controller_1 = __importDefault(require("./controllers/sync.gcal.controller"));
class SyncRoutes extends common_routes_config_1.CommonRoutesConfig {
    constructor(app) {
        super(app, "SyncRoutes");
    }
    configureRoutes() {
        this.app
            .route(backend_constants_1.GCAL_NOTIFICATION_URL)
            .post(sync_gcal_controller_1.default.handleNotification);
        this.app
            .route(`${backend_constants_1.GCAL_NOTIFICATION_URL}/stop`)
            .all(jwt_middleware_1.default.verifyTokenAndSaveUserId)
            .post(sync_gcal_controller_1.default.stopWatching);
        this.app
            .route(`${backend_constants_1.GCAL_NOTIFICATION_URL}/start`)
            .all(jwt_middleware_1.default.verifyTokenAndSaveUserId)
            .post(sync_gcal_controller_1.default.startWatching);
        return this.app;
    }
}
exports.SyncRoutes = SyncRoutes;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3luYy5yb3V0ZXMuY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3N5bmMvc3luYy5yb3V0ZXMuY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUVBLCtFQUEwRTtBQUMxRSxtRkFBb0Y7QUFDcEYsNkZBQW9FO0FBRXBFLDhGQUFvRTtBQUVwRSxNQUFhLFVBQVcsU0FBUSx5Q0FBa0I7SUFDaEQsWUFBWSxHQUF3QjtRQUNsQyxLQUFLLENBQUMsR0FBRyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQzNCLENBQUM7SUFFRCxlQUFlO1FBQ2IsSUFBSSxDQUFDLEdBQUc7YUFDTCxLQUFLLENBQUMseUNBQXFCLENBQUM7YUFDNUIsSUFBSSxDQUFDLDhCQUFrQixDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFFL0MsSUFBSSxDQUFDLEdBQUc7YUFDTCxLQUFLLENBQUMsR0FBRyx5Q0FBcUIsT0FBTyxDQUFDO2FBQ3RDLEdBQUcsQ0FBQyx3QkFBYSxDQUFDLHdCQUF3QixDQUFDO2FBQzNDLElBQUksQ0FBQyw4QkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUV6QyxJQUFJLENBQUMsR0FBRzthQUNMLEtBQUssQ0FBQyxHQUFHLHlDQUFxQixRQUFRLENBQUM7YUFDdkMsR0FBRyxDQUFDLHdCQUFhLENBQUMsd0JBQXdCLENBQUM7YUFDM0MsSUFBSSxDQUFDLDhCQUFrQixDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRTFDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQztJQUNsQixDQUFDO0NBQ0Y7QUF0QkQsZ0NBc0JDIn0=