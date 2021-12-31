import dotenv from "dotenv";
const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  throw dotenvResult.error;
}
import express from "express";
import * as http from "http";
import cors from "cors";
import helmet from "helmet";

import { CommonRoutesConfig } from "@common/common.routes.config";
import { AuthRoutes } from "@auth/auth.routes.config";
import { EventRoutes } from "@event/event.routes.config";
import { PriorityRoutes } from "@priority/priority.routes.config";
import { SyncRoutes } from "@sync/sync.routes.config";
import { CalendarRoutes } from "@calendar/calendar.routes.config";
import mongoService from "@common/services/mongo.service";
import expressLogger from "@common/logger/express.logger";
import { Logger } from "@common/logger/common.logger";
import {
  catchUndefinedSyncErrors,
  catchSyncErrors,
  promiseMiddleware,
} from "@common/middleware/promise.middleware";

/* Misc Configuration */
const logger = Logger("app:root");
mongoService;

/* Express Configuration */
const app: express.Application = express();
const server: http.Server = http.createServer(app);
const port = process.env.PORT || 3000;
const routes: Array<CommonRoutesConfig> = [];

app.use(cors());
app.use(helmet());
app.use(expressLogger);
app.use(express.json());

// initialize this middleware before routes, because
// the routes depend on its custome promise handling
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
