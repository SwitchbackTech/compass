import { type Express, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import { ProviderKindSchema } from "@core/types/sync/identity.contracts";
import { type SyncExecutionMode } from "@sync/config/sync.config";
import { verifyNotification } from "@sync/notifications/notification-verification";
import {
  type NotificationParseResult,
  type ProviderNotification,
} from "@sync/providers/provider-notifications.port";
import {
  GOOGLE_NOTIFICATIONS_PATH,
  NOTIFICATIONS_PARAM_PATH,
  type ProviderRegistry,
} from "@sync/providers/provider-registry";
import { redactedCause } from "@sync/safety/redact-error";
import {
  calendarListSyncJob,
  resourceJob,
} from "@sync/storage/contracts/job.contracts";
import { JobRepository } from "@sync/storage/repositories/job.repository";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";
import { type SyncMongoService } from "@sync/storage/sync-mongo.service";

// Legacy alias: Google push ingress (also registered under
// NOTIFICATIONS_PARAM_PATH with provider=google).
export const NOTIFICATIONS_PATH = GOOGLE_NOTIFICATIONS_PATH;

// Public callbacks arrive fast and in bursts (Google fans out per change); this
// backstop bounds a flood or a spoof storm without shaping normal delivery.
const notificationRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
});

const logger = Logger("sync:notification.routes");

export interface NotificationApiDeps {
  mongo: SyncMongoService;
  execution: SyncExecutionMode;
  registry: ProviderRegistry;
  now?: () => number;
}

// The public provider push-notification callback. It carries no auth — the
// per-channel token echoed in the headers, checked against the stored
// subscription, is the only trust. A verified change ENQUEUES a pull; it never
// pulls inline. Every recognizable notification is acknowledged with 200 so the
// provider does not retry, and the verdict (spoofed/handshake/change) is never
// revealed to the caller.
export function registerNotificationRoutes(
  app: Express,
  deps: NotificationApiDeps,
): void {
  const handleNotification =
    (routeProvider: ReturnType<typeof ProviderKindSchema.parse>) =>
    async (req: Request, res: Response) => {
      const parsed = deps.registry
        .get(routeProvider)
        .adapters.notifications.parseNotification({
          headers: req.headers as Record<string, string | undefined>,
          body: req.body,
          query: req.query as Record<string, unknown>,
        });

      if (parsed === null) {
        res.status(Status.BAD_REQUEST).end();
        return;
      }
      if (isValidationHandshake(parsed)) {
        res.status(Status.OK).type("text/plain").send(parsed.body);
        return;
      }
      if (!("channelId" in parsed)) {
        res.status(Status.BAD_REQUEST).end();
        return;
      }

      await processNotification(deps, parsed, res);
    };

  app.post(
    NOTIFICATIONS_PATH,
    notificationRateLimit,
    handleNotification("google"),
  );
  app.post(NOTIFICATIONS_PARAM_PATH, notificationRateLimit, (req, res) => {
    const parsed = ProviderKindSchema.safeParse(req.params["provider"]);
    if (!parsed.success || !deps.registry.has(parsed.data)) {
      res.status(Status.NOT_FOUND).end();
      return;
    }
    return handleNotification(parsed.data)(req, res);
  });
}

function isValidationHandshake(
  parsed: NotificationParseResult,
): parsed is { kind: "validation"; body: string } {
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    "kind" in parsed &&
    parsed.kind === "validation"
  );
}

async function processNotification(
  deps: NotificationApiDeps,
  notification: ProviderNotification,
  res: Response,
): Promise<void> {
  // A passive service has no subscriptions to match; accept and drop.
  if (deps.execution === "passive" || !deps.mongo.isConnected) {
    res.status(Status.OK).end();
    return;
  }

  try {
    const resources = new SyncResourceRepository(deps.mongo.db);
    const resource = await resources.findBySubscriptionId(
      notification.channelId,
    );
    const now = new Date((deps.now ?? Date.now)());
    const verdict = verifyNotification(notification, resource, now);

    if (verdict.status === "rejected") {
      logger.warn(
        `Rejected notification for channel ${notification.channelId}: ${verdict.reason}`,
      );
    }

    if (verdict.status === "process" && resource) {
      if (resource.resourceKind === "calendarList") {
        await resources.clearSyncCursor(
          resource.tenantId,
          resource.principalId,
          resource._id,
        );
      }
      await resources.markChangeNotified(
        resource.tenantId,
        resource.principalId,
        resource._id,
        now,
      );
      const job =
        resource.resourceKind === "calendarList"
          ? calendarListSyncJob(resource, now)
          : resourceJob(resource, "incrementalPull", now);
      await new JobRepository(deps.mongo.db).enqueue(job);
    }
    res.status(Status.OK).end();
  } catch (error) {
    logger.error(
      `Failed to process notification for channel ${notification.channelId}`,
      redactedCause(error),
    );
    res.status(Status.INTERNAL_SERVER).end();
  }
}
