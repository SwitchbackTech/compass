import { Logger } from "@core/logger/winston.logger";
import {
  createInternalAuthMiddleware,
  createInternalServiceAuthMiddleware,
} from "@sync/auth/internal-auth";
import { loadSyncConfig, type SyncConfig } from "@sync/config/sync.config";
import { CredentialCustody } from "@sync/credentials/credential-custody.service";
import {
  CONNECTION_CACHE_RETENTION_MS,
  purgeExpiredDisconnectedConnections,
} from "@sync/domain/connection-retention.service";
import {
  FAILED_JOB_MAX_REQUEUES,
  requeueFailedJobs,
} from "@sync/domain/failed-job-requeue.service";
import { reconcileStaleCalendars } from "@sync/domain/reconcile.service";
import { retryStaleCommands } from "@sync/domain/stale-command-retry.service";
import { maintainExpiringSubscriptions } from "@sync/domain/subscription-sweep.service";
import { SweepScheduler } from "@sync/domain/sweep-scheduler.service";
import { SyncJobWorker } from "@sync/domain/sync-job-worker.service";
import { SyncScheduler } from "@sync/domain/sync-scheduler.service";
import { ReadinessRegistry } from "@sync/lifecycle/readiness";
import { ShutdownCoordinator } from "@sync/lifecycle/shutdown";
import { deriveOAuthStateSecret } from "@sync/oauth/oauth-state";
import { GoogleAuthAdapter } from "@sync/providers/google/google-auth.adapter";
import { GoogleCalendarAdapter } from "@sync/providers/google/google-calendar.adapter";
import { GoogleEventReaderAdapter } from "@sync/providers/google/google-event-reader.adapter";
import { GoogleEventWriter } from "@sync/providers/google/google-event-writer.adapter";
import { GoogleNotificationAdapter } from "@sync/providers/google/google-notifications.adapter";
import { type ProviderAuthAdapter } from "@sync/providers/provider-auth.port";
import { type ProviderEventWriter } from "@sync/providers/provider-event-writer.port";
import { redactedCause } from "@sync/safety/redact-error";
import { NOTIFICATIONS_PATH } from "@sync/server/notification.routes";
import { buildSyncApp } from "@sync/server/sync.server";
import { buildServiceIdentity } from "@sync/service-identity";
import { SyncMongoService } from "@sync/storage/sync-mongo.service";
import { syncRepositories } from "@sync/storage/sync-repositories";
import { emitHealthSnapshot } from "@sync/telemetry/health-snapshot.service";
import {
  createPostHogCaptureClient,
  DEFAULT_POSTHOG_HOST,
  type PostHogCaptureClient,
} from "@sync/telemetry/posthog-capture";
import { randomUUID } from "node:crypto";
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
    // Override the provider event writer (tests inject a fake); production
    // builds it from config.
    writer?: ProviderEventWriter;
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
        serviceAuthMiddleware: createInternalServiceAuthMiddleware({
          secret: config.INTERNAL_AUTH_TOKEN,
        }),
        mongo: deps.mongo,
        execution: config.EXECUTION,
        // The provider adapter is db-free, so it is built once here (gated on
        // provider config); the per-request custody/repos build from the db.
        authAdapter: deps.authAdapter ?? buildAuthAdapter(config),
        // The event writer is likewise db-free and gated on provider config;
        // the command routes use it for provider-targeted creates.
        writer: deps.writer ?? buildEventWriter(config),
        // The OAuth CSRF state is signed with a key derived from the service
        // secret (domain-separated from internal-auth signing); the callback
        // resolves against the public base URL.
        stateSecret: deriveOAuthStateSecret(config.INTERNAL_AUTH_TOKEN),
        callbackBaseUrl: config.CALLBACK_BASE_URL,
        // Fall back to the callback base when no explicit redirect is set.
        postConnectRedirectUrl:
          config.POST_CONNECT_REDIRECT_URL ?? config.CALLBACK_BASE_URL,
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

// Build the provider event writer when the provider is configured. Gated on the
// same credentials as the auth adapter: a passive/unconfigured deployment
// returns undefined, and provider-targeted commands stay pending.
function buildEventWriter(config: SyncConfig): ProviderEventWriter | undefined {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    return undefined;
  }
  return new GoogleEventWriter();
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

    // Retention is local-only (no provider calls), so it runs in passive mode
    // too — soft-disconnected caches must still age out. Register before the
    // mongo drain so reverse-order teardown stops the sweep first.
    const retention = buildRetentionSweep(mongo);
    service.shutdown.register("retention", () => retention.stop());
    retention.start();

    // Sanitized sync_health_snapshot every five minutes (S44). Runs in passive
    // mode too so the heartbeat stays alive before provider work is enabled.
    const posthog = buildPostHogClient(config);
    if (posthog) {
      service.shutdown.register("posthog", () => posthog.shutdown());
    }
    const health = buildHealthSnapshotSweep(service.identity, mongo, posthog);
    service.shutdown.register("health", () => health.stop());
    health.start();

    // Active, provider-configured deployments also drain jobs and renew
    // channels. Those register AFTER the mongo drain so teardown stops them
    // first and closes mongo last.
    const schedulers = buildSchedulers(config, mongo);
    if (schedulers) {
      service.shutdown.register("scheduler", async () => {
        // Stop every drain; each releases only its own owner's held jobs.
        await Promise.all(schedulers.drains.map((drain) => drain.stop()));
      });
      const sweeps = [
        ["reconcile", schedulers.reconcile],
        ["subscription", schedulers.subscription],
        ["failedJobRequeue", schedulers.failedJobRequeue],
        ["staleCommandRetry", schedulers.staleCommandRetry],
      ] as const;
      for (const [name, sweep] of sweeps) {
        service.shutdown.register(name, () => sweep.stop());
      }
      for (const drain of schedulers.drains) drain.start();
      for (const [, sweep] of sweeps) sweep.start();
      logger.info(
        "Sync scheduler draining, reconciling, renewing channels, retaining, retrying stale commands, and reporting health",
      );
    } else {
      logger.info(
        "Sync retention + health snapshot started (passive / unconfigured)",
      );
    }
  } catch (error) {
    logger.error(
      "Sync storage unavailable at startup; staying up as not-ready",
      error,
    );
  }
}

// A failed job is eligible for the self-heal sweep once it has sat failed for
// at least this long — long enough that a real provider outage has had a
// chance to clear before we burn another retry ladder on it.
const FAILED_JOB_REQUEUE_COOLDOWN_MS = 30 * 60_000;
// A resource not synced within this window is swept for a reconcile pull.
const RECONCILE_STALE_AFTER_MS = 15 * 60_000;
// A cloud command left nonterminal past this long since its last update is
// eligible for a retry - long enough that a transient provider blip has
// almost certainly cleared, short enough that "deleting" doesn't sit visibly
// stuck for too long.
const STALE_COMMAND_RETRY_AFTER_MS = 5 * 60_000;
// A push channel expiring within this window is swept for renewal. Matches
// maintainSubscription's default renew guard so the sweep and the operation
// agree on what "near expiry" means.
const SUBSCRIPTION_RENEW_BEFORE_MS = 24 * 60 * 60_000;
// How often to look for soft-disconnected connections past the 30-day cache
// window. Daily is enough for the retention SLA; hourly keeps catch-up snappy.
const RETENTION_SWEEP_INTERVAL_MS = 60 * 60_000;
// Architecture: one sync_health_snapshot every five minutes.
const HEALTH_SNAPSHOT_INTERVAL_MS = 5 * 60_000;

function buildPostHogClient(config: SyncConfig): PostHogCaptureClient | null {
  if (!config.POSTHOG_KEY) return null;
  return createPostHogCaptureClient({
    apiKey: config.POSTHOG_KEY,
    host: config.POSTHOG_HOST ?? DEFAULT_POSTHOG_HOST,
  });
}

function buildHealthSnapshotSweep(
  identity: ReturnType<typeof buildServiceIdentity>,
  mongo: SyncMongoService,
  client: PostHogCaptureClient | null,
): SweepScheduler {
  return new SweepScheduler(
    {
      // SweepScheduler always passes `before`; health ignore it and use now.
      sweep: async () => {
        await emitHealthSnapshot({
          deps: { mongo, identity },
          client,
        });
        return 1;
      },
    },
    {
      intervalMs: HEALTH_SNAPSHOT_INTERVAL_MS,
      jitterRatio: 0.05,
      onError: (error) =>
        logger.error("Sync health snapshot emit failed", error),
    },
  );
}

// Local-only: purge soft-disconnected connection caches past the retention
// window. Safe without provider credentials and in passive execution.
function buildRetentionSweep(mongo: SyncMongoService): SweepScheduler {
  const deps = syncRepositories(mongo);
  return new SweepScheduler(
    {
      sweep: (before) => purgeExpiredDisconnectedConnections(deps, before),
    },
    {
      intervalMs: RETENTION_SWEEP_INTERVAL_MS,
      windowMs: -CONNECTION_CACHE_RETENTION_MS,
      onError: (error) =>
        logger.error("Sync disconnect retention sweep failed", error),
    },
  );
}

// Build the background schedulers for an active, provider-configured deployment:
// the queue DRAINS (claim and run jobs), the RECONCILE sweep (the missed-webhook
// fallback that enqueues pulls for stale calendars), and the SUBSCRIPTION sweep
// (that renews push channels before they expire). Returns null when there is
// nothing to run (passive execution, or no provider credentials to refresh access
// tokens with). Repositories bind to the now-connected db.
//
// MAX_CONCURRENCY drains run in parallel. A worker's drain loop is sequential —
// it awaits each job before claiming the next — so a single drain processes the
// whole queue one job at a time, and one long initialImport stalls every queued
// pull behind it. That starved change-propagation for hours after the
// 2026-07-29 production cutover.
//
// Each drain gets its OWN owner id, which is load-bearing: leases are per-owner
// and `releaseOwned(owner)` releases exactly that worker's held jobs on stop, so
// sharing an id would let one worker's shutdown flip another's in-flight job
// back to pending mid-run. Racing claims are already safe — claimDueJob is a
// single atomic findOneAndUpdate, so two workers can never win the same job.
function buildSchedulers(
  config: SyncConfig,
  mongo: SyncMongoService,
): {
  drains: SyncScheduler[];
  reconcile: SweepScheduler;
  subscription: SweepScheduler;
  failedJobRequeue: SweepScheduler;
  staleCommandRetry: SweepScheduler;
} | null {
  if (config.EXECUTION !== "active") return null;
  const authAdapter = buildAuthAdapter(config);
  if (!authAdapter) return null;
  const eventWriter = buildEventWriter(config);
  if (!eventWriter) return null;

  const repos = syncRepositories(mongo);
  const resources = repos.syncResources;
  const jobs = repos.jobs;
  const buildDrain = (): SyncScheduler => {
    const owner = randomUUID();
    const worker = new SyncJobWorker(
      {
        events: repos.events,
        occurrences: repos.eventOccurrences,
        resources,
        calendars: repos.calendars,
        connections: repos.connections,
        discovery: new GoogleCalendarAdapter(),
        commands: repos.commands,
        jobs,
        reader: new GoogleEventReaderAdapter(),
        custody: new CredentialCustody(repos.credentials, authAdapter),
        notifications: new GoogleNotificationAdapter(),
        // Where the provider posts change notifications back; the callback route
        // verifies them against the stored subscription.
        callbackUrl: `${config.CALLBACK_BASE_URL}${NOTIFICATIONS_PATH}`,
        invalidations: repos.invalidations,
      },
      owner,
      {
        onError: (error) => logger.error("Sync job engine failed", error),
        onDrop: (job, reason) =>
          logger.warn(`Sync job ${job.kind} (${job._id}) dropped: ${reason}`),
      },
    );
    return new SyncScheduler(
      { worker, jobs },
      {
        owner,
        onError: (error) => logger.error("Sync job drain failed", error),
      },
    );
  };
  const drains = Array.from({ length: config.MAX_CONCURRENCY }, buildDrain);
  // The reconcile fallback looks BACK: enqueue a pull for any events resource not
  // synced within the stale window (negative offset from now).
  const reconcile = new SweepScheduler(
    {
      sweep: async (before) => {
        const enqueued = await reconcileStaleCalendars(
          { resources, jobs },
          before,
          () => new Date(),
        );
        // One line per cycle with work: silence here previously meant either
        // "all fresh" or "sweep dead", indistinguishably.
        if (enqueued > 0) {
          logger.info(`Sync reconcile sweep enqueued ${enqueued} pull(s)`);
        }
        return enqueued;
      },
    },
    {
      windowMs: -RECONCILE_STALE_AFTER_MS,
      onError: (error) => logger.error("Sync reconcile sweep failed", error),
    },
  );
  // Subscription maintenance looks AHEAD: enqueue a renewal for any push channel
  // expiring within the renew window (positive offset from now), so a channel is
  // replaced before it lapses. Aligns with maintainSubscription's renew guard.
  const subscription = new SweepScheduler(
    {
      sweep: (before) =>
        maintainExpiringSubscriptions(
          { resources, jobs },
          before,
          () => new Date(),
        ),
    },
    {
      windowMs: SUBSCRIPTION_RENEW_BEFORE_MS,
      onError: (error) =>
        logger.error("Sync subscription maintenance sweep failed", error),
    },
  );
  // Self-heal sweep: give jobs stuck in state:"failed" a fresh retry ladder
  // once they have cooled down, and loudly log any that keep re-failing past
  // the requeue cap. Looks BACK, like reconcile — a job is eligible once it
  // has been failed since before the cooldown window.
  const failedJobRequeue = new SweepScheduler(
    {
      sweep: async (before) => {
        const result = await requeueFailedJobs(
          { jobs },
          before,
          () => new Date(),
          FAILED_JOB_MAX_REQUEUES,
        );
        if (result.requeued > 0) {
          logger.info(
            `Sync self-heal sweep requeued ${result.requeued} failed job(s)`,
          );
        }
        if (result.exhausted > 0) {
          logger.error(
            `Sync self-heal sweep: ${result.exhausted} failed job(s) exhausted their requeue budget and need operator attention`,
            {
              exhaustedJobs: result.exhaustedJobs.map((job) => ({
                id: job.id,
                coalescingKey: job.coalescingKey,
                connectionId: job.connectionId,
                failureClass: job.failureClass,
                requeuedCount: job.requeuedCount,
                updatedAt: job.updatedAt.toISOString(),
              })),
            },
          );
        }
        return result.requeued;
      },
    },
    {
      windowMs: -FAILED_JOB_REQUEUE_COOLDOWN_MS,
      onError: (error) => logger.error("Sync self-heal sweep failed", error),
    },
  );
  // Self-heal sweep for the OTHER kind of stuck work: a cloud-targeted
  // update/delete command that hit a transient provider failure mid-execute.
  // Those run inline from the HTTP request (not as a job), and nothing else
  // ever revisits a command left nonterminal that way - see
  // stale-command-retry.service.ts. Looks BACK, like reconcile/failedJobRequeue.
  const staleCommandRetry = new SweepScheduler(
    {
      sweep: async (before) => {
        const result = await retryStaleCommands(
          {
            commands: repos.commands,
            events: repos.events,
            calendars: repos.calendars,
            occurrences: repos.eventOccurrences,
            markers: repos.deletionMarkers,
            execution: config.EXECUTION,
            provider: {
              writer: eventWriter,
              custody: new CredentialCustody(repos.credentials, authAdapter),
            },
          },
          before,
          () => new Date(),
        );
        if (result.attempted > 0) {
          logger.info(
            `Sync stale-command sweep retried ${result.attempted} command(s), ${result.stillStale} still stuck`,
          );
        }
        return result.attempted;
      },
    },
    {
      windowMs: -STALE_COMMAND_RETRY_AFTER_MS,
      onError: (error) =>
        logger.error("Sync stale-command retry sweep failed", error),
    },
  );
  return {
    drains,
    reconcile,
    subscription,
    failedJobRequeue,
    staleCommandRetry,
  };
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

if (import.meta.main) {
  // Registering a handler suppresses Node/Bun's default crash-on-unhandled-
  // rejection behavior, so without one of our own the process would keep
  // running silently after whatever left a promise dangling - no log, no
  // restart, just a process in an unknown state. Log with context, then exit
  // the same way an uncaught synchronous throw would. Gated behind
  // import.meta.main like the rest of this block so a test importing this
  // module for its exports never installs a process-wide handler. `reason`
  // can be anything, including a raw GaxiosError from an uncaught Google API
  // call (this process talks to Google constantly) - redactedCause strips
  // its config/response before logging.
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", redactedCause(reason));
    process.exit(1);
  });

  start().catch((error) => {
    logger.error("Sync service failed to start", error);
    process.exit(1);
  });
}
