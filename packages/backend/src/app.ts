import path from "path";
import moduleAlias from "module-alias";
moduleAlias.addAliases({
  "@backend": `${__dirname}`,
  "@core": `${path.resolve(__dirname, "../../core/src")}`,
});
import dotenv from "dotenv";
const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  throw dotenvResult.error;
}
import express from "express";
import * as http from "http";
import helmet from "helmet";
import corsWhitelist from "@backend/common/middleware/cors.middleware";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import { AuthRoutes } from "@backend/auth/auth.routes.config";
import { EventRoutes } from "@backend/event/event.routes.config";
import { PriorityRoutes } from "@backend/priority/priority.routes.config";
import { SyncRoutes } from "@backend/sync/sync.routes.config";
import { CalendarRoutes } from "@backend/calendar/calendar.routes.config";
import { ENV } from "@backend/common/constants/env.constants";
import mongoService from "@backend/common/services/mongo.service";
import expressLogger from "@backend/common/logger/express.logger";
import { Logger } from "@core/logger/winston.logger";
import {
  catchSyncErrors,
  promiseMiddleware,
} from "@backend/common/middleware/promise.middleware";

/* Misc Configuration */
const logger = Logger("app:root");
mongoService;

/* Express Configuration */
const app: express.Application = express();
const server: http.Server = http.createServer(app);
const port = ENV.PORT;
const routes: Array<CommonRoutesConfig> = [];

app.use(corsWhitelist);
app.use(helmet());
app.use(expressLogger);
app.use(express.json());

// initialize this middleware before routes, because
// the routes depend on its custome promise handling
//@ts-ignore
app.use(promiseMiddleware());

routes.push(new AuthRoutes(app));
routes.push(new PriorityRoutes(app));
routes.push(new EventRoutes(app));
routes.push(new SyncRoutes(app));
routes.push(new CalendarRoutes(app));

// app.use(catchUndefinedSyncErrors);
app.use(catchSyncErrors);

/* Express Start */
server.listen(port, () => {
  logger.info(`Server running on port: ${port}`);
});
