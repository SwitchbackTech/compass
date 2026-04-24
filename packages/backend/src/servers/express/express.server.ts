import express, { type Application } from "express";
import helmet from "helmet";
import {
  errorHandler as supertokensErrorHandler,
  middleware as supertokensMiddleware,
} from "supertokens-node/framework/express";
import { type AppConfig, AppConfigSchema } from "@core/types/config.types";
import { AuthRoutes } from "@backend/auth/auth.routes.config";
import { CalendarRoutes } from "@backend/calendar/calendar.routes.config";
import { type CommonRoutesConfig } from "@backend/common/common.routes.config";
import {
  ENV,
  isGoogleConfigured,
} from "@backend/common/constants/env.constants";
import corsWhitelist from "@backend/common/middleware/cors.middleware";
import { httpLoggingMiddleware } from "@backend/common/middleware/http.logger.middleware";
import { requestMiddleware } from "@backend/common/middleware/promise.middleware";
import {
  initSupertokens,
  supertokensCors,
} from "@backend/common/middleware/supertokens.middleware";
import { EventRoutes } from "@backend/event/event.routes.config";
import { EventsRoutes } from "@backend/events/events.routes.config";
import { HealthRoutes } from "@backend/health/health.routes.config";
import { PriorityRoutes } from "@backend/priority/priority.routes.config";
import { SyncRoutes } from "@backend/sync/sync.routes.config";
import { UserRoutes } from "@backend/user/user.routes.config";

const getAppConfig = (): AppConfig =>
  AppConfigSchema.parse({
    google: {
      isConfigured: isGoogleConfigured(ENV),
    },
  });

export const initExpressServer = () => {
  /* Express Configuration */
  const app: Application = express();

  initSupertokens();

  // initialize middleware before routes, because
  // some routes depend on them
  app.use(requestMiddleware());
  app.use(supertokensCors());
  app.use(supertokensMiddleware());
  app.use(corsWhitelist);
  app.use(helmet());
  app.use(httpLoggingMiddleware);
  app.use(express.json());

  const routes: Array<CommonRoutesConfig> = [];
  routes.push(new HealthRoutes(app));
  app.get("/api/config", (_req, res) => res.json(getAppConfig()));
  routes.push(new AuthRoutes(app));
  routes.push(new UserRoutes(app));
  routes.push(new PriorityRoutes(app));
  routes.push(new EventRoutes(app));
  routes.push(new EventsRoutes(app));
  routes.push(new SyncRoutes(app));
  routes.push(new CalendarRoutes(app));

  app.use(supertokensErrorHandler()); // Keep this after routes

  return app;
};
