import express, { type Express } from "express";
import { type ReadinessRegistry } from "@sync/lifecycle/readiness";
import {
  type ConnectionApiDeps,
  registerConnectionRoutes,
} from "@sync/server/connection.routes";
import { registerHealthRoutes } from "@sync/server/health.routes";
import { registerNotificationRoutes } from "@sync/server/notification.routes";
import { type StructuredServiceIdentity } from "@sync/service-identity";

// Builds the Sync service's HTTP application. Health probes are always public
// and content-free. The internal connection API mounts only when its storage
// dependency is supplied, so the health-only paths need no database. OAuth /
// webhook ingress and query routes mount here in later commits.
export function buildSyncApp(deps: {
  identity: StructuredServiceIdentity;
  readiness: ReadinessRegistry;
  connectionApi?: ConnectionApiDeps;
}): Express {
  const app = express();
  app.use(express.json());

  registerHealthRoutes(app, deps);
  if (deps.connectionApi) {
    registerConnectionRoutes(app, deps.connectionApi);
    // The public webhook ingress shares the connection API's storage; it needs
    // no auth adapter or secrets, only the db and execution mode.
    registerNotificationRoutes(app, {
      mongo: deps.connectionApi.mongo,
      execution: deps.connectionApi.execution,
      now: deps.connectionApi.now,
    });
  }

  return app;
}
