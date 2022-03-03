"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path_1 = (0, tslib_1.__importDefault)(require("path"));
//todo use ENV
const corePath =
  process.env["NODE_ENV"] === "production"
    ? path_1.default.resolve(__dirname, "../../core/src")
    : path_1.default.resolve(__dirname, "../../core/src");
console.log(corePath);
const module_alias_1 = (0, tslib_1.__importDefault)(require("module-alias"));
// eslint-disable-next-line
module_alias_1.default.addAliases({
  "@backend": `${__dirname}`,
  "@core": `${corePath}`,
});
const dotenv_1 = (0, tslib_1.__importDefault)(require("dotenv"));
const dotenvResult = dotenv_1.default.config();
if (dotenvResult.error) {
  throw dotenvResult.error;
}
const express_1 = (0, tslib_1.__importDefault)(require("express"));
const http = (0, tslib_1.__importStar)(require("http"));
const helmet_1 = (0, tslib_1.__importDefault)(require("helmet"));
const cors_middleware_1 = (0, tslib_1.__importDefault)(
  require("@backend/common/middleware/cors.middleware")
);
const auth_routes_config_1 = require("@backend/auth/auth.routes.config");
const event_routes_config_1 = require("@backend/event/event.routes.config");
const priority_routes_config_1 = require("@backend/priority/priority.routes.config");
const sync_routes_config_1 = require("@backend/sync/sync.routes.config");
const dev_routes_config_1 = require("@backend/dev/dev.routes.config");
const calendar_routes_config_1 = require("@backend/calendar/calendar.routes.config");
const mongo_service_1 = (0, tslib_1.__importDefault)(
  require("@backend/common/services/mongo.service")
);
const express_logger_1 = (0, tslib_1.__importDefault)(
  require("@backend/common/logger/express.logger")
);
const winston_logger_1 = require("@core/logger/winston.logger");
const promise_middleware_1 = require("@backend/common/middleware/promise.middleware");
const common_helpers_1 = require("./common/helpers/common.helpers");
/* Misc Configuration */
const logger = (0, winston_logger_1.Logger)("app:root");
mongo_service_1.default;
/* Express Configuration */
const app = (0, express_1.default)();
const server = http.createServer(app);
const port = process.env["PORT"] || 3000;
const routes = [];
app.use(cors_middleware_1.default);
app.use((0, helmet_1.default)());
app.use(express_logger_1.default);
app.use(express_1.default.json());
// initialize this middleware before routes, because
// the routes depend on its custome promise handling
//@ts-ignore
app.use((0, promise_middleware_1.promiseMiddleware)());
routes.push(new auth_routes_config_1.AuthRoutes(app));
routes.push(new priority_routes_config_1.PriorityRoutes(app));
routes.push(new event_routes_config_1.EventRoutes(app));
routes.push(new sync_routes_config_1.SyncRoutes(app));
routes.push(new calendar_routes_config_1.CalendarRoutes(app));
if ((0, common_helpers_1.isDev)()) {
  routes.push(new dev_routes_config_1.DevRoutes(app));
}
// app.use(catchUndefinedSyncErrors);
app.use(promise_middleware_1.catchSyncErrors);
/* Express Start */
server.listen(port, () => {
  logger.info(`Server running on port: ${port}`);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vcGFja2FnZXMvYmFja2VuZC9zcmMvYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZEQUF3QjtBQUN4QixjQUFjO0FBQ2QsTUFBTSxRQUFRLEdBQ1osT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxZQUFZO0lBQ3RDLENBQUMsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQztJQUMzQyxDQUFDLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztBQUNoRCxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3RCLDZFQUF1QztBQUN2QywyQkFBMkI7QUFDM0Isc0JBQVcsQ0FBQyxVQUFVLENBQUM7SUFDckIsVUFBVSxFQUFFLEdBQUcsU0FBUyxFQUFFO0lBQzFCLE9BQU8sRUFBRSxHQUFHLFFBQVEsRUFBRTtDQUN2QixDQUFDLENBQUM7QUFDSCxpRUFBNEI7QUFDNUIsTUFBTSxZQUFZLEdBQUcsZ0JBQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUNyQyxJQUFJLFlBQVksQ0FBQyxLQUFLLEVBQUU7SUFDdEIsTUFBTSxZQUFZLENBQUMsS0FBSyxDQUFDO0NBQzFCO0FBQ0QsbUVBQThCO0FBQzlCLHdEQUE2QjtBQUM3QixpRUFBNEI7QUFDNUIsOEdBQXVFO0FBRXZFLHlFQUE4RDtBQUM5RCw0RUFBaUU7QUFDakUscUZBQTBFO0FBQzFFLHlFQUE4RDtBQUM5RCxzRUFBMkQ7QUFDM0QscUZBQTBFO0FBQzFFLHdHQUFrRTtBQUNsRSx3R0FBa0U7QUFDbEUsZ0VBQXFEO0FBQ3JELHNGQUd1RDtBQUV2RCxvRUFBd0Q7QUFFeEQsd0JBQXdCO0FBQ3hCLE1BQU0sTUFBTSxHQUFHLElBQUEsdUJBQU0sRUFBQyxVQUFVLENBQUMsQ0FBQztBQUNsQyx1QkFBWSxDQUFDO0FBRWIsMkJBQTJCO0FBQzNCLE1BQU0sR0FBRyxHQUF3QixJQUFBLGlCQUFPLEdBQUUsQ0FBQztBQUMzQyxNQUFNLE1BQU0sR0FBZ0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNuRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQztBQUN6QyxNQUFNLE1BQU0sR0FBOEIsRUFBRSxDQUFDO0FBRTdDLEdBQUcsQ0FBQyxHQUFHLENBQUMseUJBQWEsQ0FBQyxDQUFDO0FBQ3ZCLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBQSxnQkFBTSxHQUFFLENBQUMsQ0FBQztBQUNsQixHQUFHLENBQUMsR0FBRyxDQUFDLHdCQUFhLENBQUMsQ0FBQztBQUN2QixHQUFHLENBQUMsR0FBRyxDQUFDLGlCQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUV4QixvREFBb0Q7QUFDcEQsb0RBQW9EO0FBQ3BELFlBQVk7QUFDWixHQUFHLENBQUMsR0FBRyxDQUFDLElBQUEsc0NBQWlCLEdBQUUsQ0FBQyxDQUFDO0FBRTdCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSwrQkFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDakMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLHVDQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNyQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksaUNBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ2xDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSwrQkFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDakMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLHVDQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUVyQyxJQUFJLElBQUEsc0JBQUssR0FBRSxFQUFFO0lBQ1gsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLDZCQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztDQUNqQztBQUVELHFDQUFxQztBQUNyQyxHQUFHLENBQUMsR0FBRyxDQUFDLG9DQUFlLENBQUMsQ0FBQztBQUV6QixtQkFBbUI7QUFDbkIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFO0lBQ3ZCLE1BQU0sQ0FBQyxJQUFJLENBQUMsMkJBQTJCLElBQUksRUFBRSxDQUFDLENBQUM7QUFDakQsQ0FBQyxDQUFDLENBQUMifQ==
