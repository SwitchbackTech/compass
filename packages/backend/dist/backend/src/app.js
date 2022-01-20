"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const dotenvResult = dotenv_1.default.config();
if (dotenvResult.error) {
    throw dotenvResult.error;
}
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const http = __importStar(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const auth_routes_config_1 = require("@backend/auth/auth.routes.config");
const event_routes_config_1 = require("@backend/event/event.routes.config");
const priority_routes_config_1 = require("@backend/priority/priority.routes.config");
const sync_routes_config_1 = require("@backend/sync/sync.routes.config");
const calendar_routes_config_1 = require("@backend/calendar/calendar.routes.config");
const mongo_service_1 = __importDefault(require("@backend/common/services/mongo.service"));
const express_logger_1 = __importDefault(require("@backend/common/logger/express.logger"));
const common_logger_1 = require("@backend/common/logger/common.logger");
const promise_middleware_1 = require("@backend/common/middleware/promise.middleware");
/* Misc Configuration */
const logger = common_logger_1.Logger("app:root");
mongo_service_1.default;
/* Express Configuration */
const app = express_1.default();
const server = http.createServer(app);
const port = process.env.PORT || 3000;
const routes = [];
app.use(cors_1.default());
app.use(helmet_1.default());
app.use(express_logger_1.default);
app.use(express_1.default.json());
// app.use("/static", express.static(path.join(__dirname, "public")));
const webCode = path_1.default.join(__dirname, "../webDist"); //TODO move
console.log(webCode); //TODO move
app.use(express_1.default.static(webCode));
// initialize this middleware before routes, because
// the routes depend on its custome promise handling
app.use(promise_middleware_1.promiseMiddleware());
routes.push(new auth_routes_config_1.AuthRoutes(app));
routes.push(new priority_routes_config_1.PriorityRoutes(app));
routes.push(new event_routes_config_1.EventRoutes(app));
routes.push(new sync_routes_config_1.SyncRoutes(app));
routes.push(new calendar_routes_config_1.CalendarRoutes(app));
// app.use(catchUndefinedSyncErrors);
app.use(promise_middleware_1.catchSyncErrors);
/* Express Start */
server.listen(port, () => {
    logger.info(`Server running on port: ${port}`);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxvREFBNEI7QUFDNUIsTUFBTSxZQUFZLEdBQUcsZ0JBQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUNyQyxJQUFJLFlBQVksQ0FBQyxLQUFLLEVBQUU7SUFDdEIsTUFBTSxZQUFZLENBQUMsS0FBSyxDQUFDO0NBQzFCO0FBQ0Qsc0RBQThCO0FBQzlCLGdEQUF3QjtBQUN4QiwyQ0FBNkI7QUFDN0IsZ0RBQXdCO0FBQ3hCLG9EQUE0QjtBQUc1Qix5RUFBOEQ7QUFDOUQsNEVBQWlFO0FBQ2pFLHFGQUEwRTtBQUMxRSx5RUFBOEQ7QUFDOUQscUZBQTBFO0FBQzFFLDJGQUFrRTtBQUNsRSwyRkFBa0U7QUFDbEUsd0VBQThEO0FBQzlELHNGQUl1RDtBQUV2RCx3QkFBd0I7QUFDeEIsTUFBTSxNQUFNLEdBQUcsc0JBQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNsQyx1QkFBWSxDQUFDO0FBRWIsMkJBQTJCO0FBQzNCLE1BQU0sR0FBRyxHQUF3QixpQkFBTyxFQUFFLENBQUM7QUFDM0MsTUFBTSxNQUFNLEdBQWdCLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDbkQsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDO0FBQ3RDLE1BQU0sTUFBTSxHQUE4QixFQUFFLENBQUM7QUFFN0MsR0FBRyxDQUFDLEdBQUcsQ0FBQyxjQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQ2hCLEdBQUcsQ0FBQyxHQUFHLENBQUMsZ0JBQU0sRUFBRSxDQUFDLENBQUM7QUFDbEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyx3QkFBYSxDQUFDLENBQUM7QUFDdkIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxpQkFBTyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7QUFFeEIsc0VBQXNFO0FBQ3RFLE1BQU0sT0FBTyxHQUFHLGNBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsV0FBVztBQUMvRCxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsV0FBVztBQUNqQyxHQUFHLENBQUMsR0FBRyxDQUFDLGlCQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFFakMsb0RBQW9EO0FBQ3BELG9EQUFvRDtBQUNwRCxHQUFHLENBQUMsR0FBRyxDQUFDLHNDQUFpQixFQUFFLENBQUMsQ0FBQztBQUU3QixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksK0JBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSx1Q0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDckMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLGlDQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNsQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksK0JBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSx1Q0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFFckMscUNBQXFDO0FBQ3JDLEdBQUcsQ0FBQyxHQUFHLENBQUMsb0NBQWUsQ0FBQyxDQUFDO0FBRXpCLG1CQUFtQjtBQUNuQixNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7SUFDdkIsTUFBTSxDQUFDLElBQUksQ0FBQywyQkFBMkIsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUNqRCxDQUFDLENBQUMsQ0FBQyJ9