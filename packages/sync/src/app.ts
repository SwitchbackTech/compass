import { Logger } from "@core/logger/winston.logger";
import { loadSyncConfig, type SyncConfig } from "@sync/config/sync.config";
import { ReadinessRegistry } from "@sync/lifecycle/readiness";
import { ShutdownCoordinator } from "@sync/lifecycle/shutdown";
import { buildSyncApp } from "@sync/server/sync.server";
import { buildServiceIdentity } from "@sync/service-identity";
import { createServer, type Server } from "node:http";

const logger = Logger("sync:app");

export interface SyncService {
  readonly identity: ReturnType<typeof buildServiceIdentity>;
  readonly readiness: ReadinessRegistry;
  readonly shutdown: ShutdownCoordinator;
  readonly httpServer: Server;
}

// Wires the service's lifecycle pieces from a validated config without binding
// a port or reading a file — so tests can drive it directly. Later commits
// register storage/scheduler readiness checks and drain tasks against the
// returned registries (S11+).
export function createSyncService(config: SyncConfig): SyncService {
  const identity = buildServiceIdentity({
    environment: config.NODE_ENV,
    execution: config.EXECUTION,
  });
  const readiness = new ReadinessRegistry();
  const shutdown = new ShutdownCoordinator();

  const app = buildSyncApp({ identity, readiness });
  const httpServer = createServer(app);

  shutdown.register("http-server", () => closeHttpServer(httpServer));

  return { identity, readiness, shutdown, httpServer };
}

function closeHttpServer(httpServer: Server): Promise<void> {
  if (!httpServer.listening) return Promise.resolve();
  return new Promise((resolve, reject) =>
    httpServer.close((error) => (error ? reject(error) : resolve())),
  );
}

async function start(): Promise<void> {
  const config = loadSyncConfig();
  const service = createSyncService(config);

  registerSignalHandlers(service.shutdown, logger);

  await new Promise<void>((resolve) =>
    service.httpServer.listen(config.PORT, () => {
      logger.info(
        `${service.identity.name} listening on ${config.PORT} (${service.identity.environment}, execution=${service.identity.execution})`,
      );
      resolve();
    }),
  );
}

function registerSignalHandlers(
  shutdown: ShutdownCoordinator,
  log: ReturnType<typeof Logger>,
): void {
  const handle = (signal: NodeJS.Signals) => {
    if (shutdown.isShuttingDown) return;
    log.info(`Received ${signal}, draining Sync service`);
    void shutdown.shutdown().then((errors) => {
      for (const { name, error } of errors) {
        log.error(`Shutdown task "${name}" failed`, error);
      }
    });
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
