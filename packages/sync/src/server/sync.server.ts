import express, { type Express } from "express";
import { type ReadinessRegistry } from "@sync/lifecycle/readiness";
import { registerHealthRoutes } from "@sync/server/health.routes";
import { type StructuredServiceIdentity } from "@sync/service-identity";

// Builds the Sync service's HTTP application (ledger S09). S09 mounts only the
// content-free health probes; internal-auth middleware (S10), connection/OAuth
// ingress (S24), webhook ingress (S32), and query routes (S25) mount here in
// later commits. JSON body parsing is enabled now so those routes compose
// without re-wiring the app.
export function buildSyncApp(deps: {
  identity: StructuredServiceIdentity;
  readiness: ReadinessRegistry;
}): Express {
  const app = express();
  app.use(express.json());

  registerHealthRoutes(app, deps);

  return app;
}
