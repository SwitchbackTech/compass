import express, { type Application } from "express";
import helmet from "helmet";
import {
  errorHandler as supertokensErrorHandler,
  middleware as supertokensMiddleware,
} from "supertokens-node/framework/express";
import { AuthRoutes } from "@backend/auth/auth.routes.config";
import { STRIPE_WEBHOOK_PATH } from "@backend/billing/billing.constants";
import { BillingRoutes } from "@backend/billing/billing.routes.config";
import { CalendarRoutes } from "@backend/calendar/calendar.routes.config";
import { type CommonRoutesConfig } from "@backend/common/common.routes.config";
import corsWhitelist from "@backend/common/middleware/cors.middleware";
import { httpLoggingMiddleware } from "@backend/common/middleware/http.logger.middleware";
import { requestMiddleware } from "@backend/common/middleware/promise.middleware";
import {
  initSupertokens,
  supertokensCors,
} from "@backend/common/middleware/supertokens.middleware";
import { ConfigRoutes } from "@backend/config/config.routes.config";
import { EventRoutes } from "@backend/event/event.routes.config";
import { HealthRoutes } from "@backend/health/health.routes.config";
import { EventsRoutes } from "@backend/servers/sse/events-stream.routes.config";
import { UserRoutes } from "@backend/user/user.routes.config";

export const initExpressServer = () => {
  /* Express Configuration */
  const app: Application = express();
  // Caddy terminates TLS and proxies `/api/*` with X-Forwarded-For. One hop
  // of trust keeps express-rate-limit from treating every visitor as Caddy.
  app.set("trust proxy", 1);

  initSupertokens();

  // initialize middleware before routes, because
  // some routes depend on them
  app.use(requestMiddleware());
  app.use(supertokensCors());
  app.use(supertokensMiddleware());
  app.use(corsWhitelist);
  app.use(helmet());
  app.use(httpLoggingMiddleware);
  // Stripe signs the raw bytes. express.json() would parse application/json
  // first and every signature check would 400. Path-scoped raw parser must
  // run before the global JSON parser.
  app.use(STRIPE_WEBHOOK_PATH, express.raw({ type: "application/json" }));
  app.use(express.json());

  const routes: Array<CommonRoutesConfig> = [];
  routes.push(new HealthRoutes(app));
  routes.push(new ConfigRoutes(app));
  routes.push(new AuthRoutes(app));
  routes.push(new UserRoutes(app));
  routes.push(new BillingRoutes(app));
  routes.push(new EventRoutes(app));
  routes.push(new EventsRoutes(app));
  routes.push(new CalendarRoutes(app));

  app.use(supertokensErrorHandler()); // Keep this after routes

  return app;
};
