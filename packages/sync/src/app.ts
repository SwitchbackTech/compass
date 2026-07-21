import { Logger } from "@core/logger/winston.logger";
import { createInternalAuthMiddleware } from "@sync/auth/internal-auth";
import { loadSyncConfig, type SyncConfig } from "@sync/config/sync.config";
import { ReadinessRegistry } from "@sync/lifecycle/readiness";
import { ShutdownCoordinator } from "@sync/lifecycle/shutdown";
import { deriveOAuthStateSecret } from "@sync/oauth/oauth-state";
import { GoogleAuthAdapter } from "@sync/providers/google/google-auth.adapter";
import { type ProviderAuthAdapter } from "@sync/providers/provider-auth.port";
import { buildSyncApp } from "@sync/server/sync.server";
import { buildServiceIdentity } from "@sync/service-identity";
import { SyncMongoService } from "@sync/storage/sync-mongo.service";
import { createServer, type Server } from "node:http";

const logger = Logger("sync:app");

export interface SyncService {
  readonly identity: ReturnType<typeof buildServiceIdentity>;
  readonly readiness: ReadinessRegistry;
  readonly shutdown: ShutdownCoordinator;
  readonly httpServer: Server;
  // Graceful stop: close the HTTP front door first (stop admitting new work),
  // then drain background dependencies in reverse order (workers -> storage).
  // Idempotent — safe to call from repeated signals or test cleanup.
  readonly stop: () => Promise<void>;
}

// Wires the service's lifecycle pieces from a validated config without binding
// a port or reading a file — so tests can drive it directly. Later commits
// register storage/scheduler readiness checks and drain tasks against the
// returned registries.
export function createSyncService(
  config: SyncConfig,
  deps: {
    mongo?: SyncMongoService;
    // Override the provider adapter (tests inject a fake to avoid the network);
    // production builds it from config.
    authAdapter?: ProviderAuthAdapter;
  } = {},
): SyncService {
  const identity = buildServiceIdentity({
    environment: config.NODE_ENV,
    execution: config.EXECUTION,
  });
  const readiness = new ReadinessRegistry();
  const shutdown = new ShutdownCoordinator();

  // The internal connection API mounts only when storage is provided. Its
  // routes read the connected db per request, so the app is still built before
  // Mongo connects (liveness-first startup).
  const connectionApi = deps.mongo
    ? {
        authMiddleware: createInternalAuthMiddleware({
          secret: config.INTERNAL_AUTH_TOKEN,
        }),
        mongo: deps.mongo,
        execution: config.EXECUTION,
        // The provider adapter is db-free, so it is built once here (gated on
        // provider config); the per-request custody/repos build from the db.
        authAdapter: deps.authAdapter ?? buildAuthAdapter(config),
        // The OAuth CSRF state is signed with a key derived from the service
        // secret (domain-separated from internal-auth signing); the callback
        // resolves against the public base URL.
        stateSecret: deriveOAuthStateSecret(config.INTERNAL_AUTH_TOKEN),
        callbackBaseUrl: config.CALLBACK_BASE_URL,
      }
    : undefined;

  const app = buildSyncApp({ identity, readiness, connectionApi });
  const httpServer = createServer(app);

  const stop = async (): Promise<void> => {
    // Phase 1: stop accepting new connections before anything drains, so no
    // new request can hit a dependency that is about to close.
    await closeHttpServer(httpServer);
    // Phase 2: reverse-order teardown of background dependencies. The
    // coordinator is idempotent, so a second stop() (repeated signal, test
    // cleanup) does not re-run drains.
    const errors = await shutdown.shutdown();
    for (const { name, error } of errors) {
      logger.error(`Shutdown task "${name}" failed`, error);
    }
  };

  return { identity, readiness, shutdown, httpServer, stop };
}

// Build the provider authorization adapter when the provider is configured.
// A passive deployment without provider credentials returns undefined, and the
// connection API refuses provider-touching operations rather than failing.
function buildAuthAdapter(config: SyncConfig): ProviderAuthAdapter | undefined {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    return undefined;
  }
  return new GoogleAuthAdapter(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
  );
}

function closeHttpServer(httpServer: Server): Promise<void> {
  if (!httpServer.listening) return Promise.resolve();
  return new Promise((resolve, reject) =>
    httpServer.close((error) => (error ? reject(error) : resolve())),
  );
}

async function start(): Promise<void> {
  const config = loadSyncConfig();

  // Build the mongo service before the app so the internal connection API can
  // read from it. It is not connected yet; the app binds its port first and the
  // routes access the db lazily, per request.
  const mongo = new SyncMongoService();
  const service = createSyncService(config, { mongo });

  // Register the disconnect drain first so, under the coordinator's
  // reverse-order teardown, storage closes LAST — after any workers that
  // depend on it. Readiness reflects storage state, so /health/ready stays 503
  // until Mongo is connected and its indexes are installed.
  service.shutdown.register("mongo", () => mongo.disconnect());
  service.readiness.register("storage", async () => {
    if (!mongo.isConnected) return false;
    await mongo.db.command({ ping: 1 });
    return true;
  });

  registerSignalHandlers(service, logger);

  // Bind the port before connecting storage so liveness comes up regardless.
  // A passive service must stay alive and report not-ready if Mongo is
  // unreachable, rather than crash-loop under the restart policy.
  await new Promise<void>((resolve) =>
    service.httpServer.listen(config.PORT, () => {
      logger.info(
        `${service.identity.name} listening on ${config.PORT} (${service.identity.environment}, execution=${service.identity.execution})`,
      );
      resolve();
    }),
  );

  // Connect storage after the port is open. A failure — unreachable store, or
  // a least-privilege violation — is logged and leaves readiness at 503; it
  // does not take the process down. The passive service does no work until
  // ready, so staying up-but-not-ready is safe and diagnosable.
  try {
    await mongo.connect({
      uri: config.MONGO_URI,
      forbiddenDatabaseName: config.COMPASS_API_DATABASE,
      enforceLeastPrivilege: config.ENFORCE_LEAST_PRIVILEGE,
    });
  } catch (error) {
    logger.error(
      "Sync storage unavailable at startup; staying up as not-ready",
      error,
    );
  }
}

function registerSignalHandlers(
  service: SyncService,
  log: ReturnType<typeof Logger>,
): void {
  const handle = (signal: NodeJS.Signals) => {
    if (service.shutdown.isShuttingDown) return;
    log.info(`Received ${signal}, draining Sync service`);
    void service.stop();
  };

  process.on("SIGTERM", () => handle("SIGTERM"));
  process.on("SIGINT", () => handle("SIGINT"));
  process.on("SIGQUIT", () => handle("SIGQUIT"));
}

// Retained for the scaffold identity test and quick manual smoke checks.
export function describeSyncService(): string {
  return "compass-sync scaffold ready";
}

if (import.meta.main) {
  start().catch((error) => {
    logger.error("Sync service failed to start", error);
    process.exit(1);
  });
}
