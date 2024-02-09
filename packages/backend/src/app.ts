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
import express, { Application } from "express";
import * as http from "http";
import helmet from "helmet";
import corsWhitelist from "@backend/common/middleware/cors.middleware";
import { Logger } from "@core/logger/winston.logger";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import { AuthRoutes } from "@backend/auth/auth.routes.config";
import { EventRoutes } from "@backend/event/event.routes.config";
import { PriorityRoutes } from "@backend/priority/priority.routes.config";
import { SyncRoutes } from "@backend/sync/sync.routes.config";
import { CalendarRoutes } from "@backend/calendar/calendar.routes.config";
import { ENV } from "@backend/common/constants/env.constants";
import mongoService from "@backend/common/services/mongo.service";
import { httpLoggingMiddleware } from "@backend/common/middleware/http.logger.middleware";
import { requestMiddleware } from "@backend/common/middleware/promise.middleware";
import {
  supertokensCors,
  supertokensErrorHandler,
  supertokensMiddleware,
} from "@backend/common/middleware/supertokens.middleware";

/* Misc Configuration */
const logger = Logger("app:root");
mongoService;

/* Express Configuration */
const app: Application = express();

// initialize middleware before routes, because
// some routes depend on them
//@ts-ignore
app.use(requestMiddleware());
app.use(supertokensCors());
// eslint-disable-next-line @typescript-eslint/no-misused-promises
app.use(supertokensMiddleware());
app.use(corsWhitelist);
app.use(helmet());
app.use(httpLoggingMiddleware);
app.use(express.json());

const routes: Array<CommonRoutesConfig> = [];
routes.push(new AuthRoutes(app));
routes.push(new PriorityRoutes(app));
routes.push(new EventRoutes(app));
routes.push(new SyncRoutes(app));
routes.push(new CalendarRoutes(app));

// eslint-disable-next-line @typescript-eslint/no-misused-promises
app.use(supertokensErrorHandler()); // Keep this after routes

/* Express Start */
const server: http.Server = http.createServer(app);
const port = ENV.PORT;
server.listen(port, () => {
  logger.info(`Server running on port: ${port}`);
});
