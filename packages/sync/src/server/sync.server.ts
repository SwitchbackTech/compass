import express, { type Express, type RequestHandler } from "express";
import { type ReadinessRegistry } from "@sync/lifecycle/readiness";
import { registerConnectionRoutes } from "@sync/server/connection.routes";
import { registerHealthRoutes } from "@sync/server/health.routes";
import { type StructuredServiceIdentity } from "@sync/service-identity";
import { type SyncMongoService } from "@sync/storage/sync-mongo.service";

// Builds the Sync service's HTTP application. Health probes are always public
// and content-free. The internal connection API mounts only when its storage
// dependency is supplied, so the health-only paths need no database. OAuth /
// webhook ingress and query routes mount here in later commits.
export function buildSyncApp(deps: {
  identity: StructuredServiceIdentity;
  readiness: ReadinessRegistry;
  connectionApi?: { authMiddleware: RequestHandler; mongo: SyncMongoService };
}): Express {
  const app = express();
  app.use(express.json());

  registerHealthRoutes(app, deps);
  if (deps.connectionApi) {
    registerConnectionRoutes(app, deps.connectionApi);
  }

  return app;
}
