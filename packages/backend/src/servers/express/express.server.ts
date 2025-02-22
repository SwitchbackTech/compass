import express, { Application } from "express";
import helmet from "helmet";
import { AuthRoutes } from "@backend/auth/auth.routes.config";
import { CalendarRoutes } from "@backend/calendar/calendar.routes.config";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import corsWhitelist from "@backend/common/middleware/cors.middleware";
import { httpLoggingMiddleware } from "@backend/common/middleware/http.logger.middleware";
import { requestMiddleware } from "@backend/common/middleware/promise.middleware";
import {
  supertokensCors,
  supertokensErrorHandler,
  supertokensMiddleware,
} from "@backend/common/middleware/supertokens.middleware";
import { EventRoutes } from "@backend/event/event.routes.config";
import { PriorityRoutes } from "@backend/priority/priority.routes.config";
import { SyncRoutes } from "@backend/sync/sync.routes.config";

export const initExpressServer = () => {
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

  return app;
};
