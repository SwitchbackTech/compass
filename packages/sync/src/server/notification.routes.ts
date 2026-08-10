import { type Express } from "express";
import { rateLimit } from "express-rate-limit";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import { type SyncExecutionMode } from "@sync/config/sync.config";
import { verifyNotification } from "@sync/notifications/notification-verification";
import { GoogleNotificationAdapter } from "@sync/providers/google/google-notifications.adapter";
import { type NotificationSubscription } from "@sync/providers/provider-notifications.port";
import { redactedCause } from "@sync/safety/redact-error";
import { JOB_PRIORITY } from "@sync/storage/contracts/job.contracts";
import { type SyncResourceRecord } from "@sync/storage/contracts/sync-resource.contracts";
import { JobRepository } from "@sync/storage/repositories/job.repository";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";
import { type SyncMongoService } from "@sync/storage/sync-mongo.service";

// Public reverse-proxy path under the same `/sync/*` prefix as the OAuth
// callback (no Google Console registration required for webhooks).
export const NOTIFICATIONS_PATH = "/sync/notifications/google";

// Public callbacks arrive fast and in bursts (Google fans out per change); this
// backstop bounds a flood or a spoof storm without shaping normal delivery.
const notificationRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
});

// Header parsing only — no network, no auth — so one shared instance is fine.
const googleNotifications = new GoogleNotificationAdapter();

const logger = Logger("sync:notification.routes");

export interface NotificationApiDeps {
  mongo: SyncMongoService;
  execution: SyncExecutionMode;
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
  app.post(NOTIFICATIONS_PATH, notificationRateLimit, async (req, res) => {
    const notification = googleNotifications.parseCallback(
      req.headers as Record<string, string | undefined>,
    );
    if (!notification) {
      res.status(Status.BAD_REQUEST).end();
      return;
    }

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
      const verdict = verifyNotification(
        notification,
        toSubscription(resource),
        now,
      );

      // Never reveal the verdict to the caller (response stays 200 either
      // way), but a rejection is still worth a quiet log line - a fleet-wide
      // channel/resource desync (e.g. every callback suddenly unknownChannel)
      // would otherwise be invisible until reconcile's 15-min fallback masks
      // the symptom.
      if (verdict.status === "rejected") {
        logger.warn(
          `Rejected notification for channel ${notification.channelId}: ${verdict.reason}`,
        );
      }

      // Only an authentic change schedules work. Coalescing on the resource
      // collapses duplicate deliveries of the same change into one job.
      if (verdict.status === "process" && resource) {
        await new JobRepository(deps.mongo.db).enqueue({
          tenantId: resource.tenantId,
          principalId: resource.principalId,
          connectionId: resource.connectionId,
          resourceId: resource._id,
          commandId: null,
          kind: "incrementalPull",
          // Background on purpose: webhooks are provider-paced. Promoting them
          // to user priority would make the entire steady state urgent and
          // defeat the tier that protects Refresh / post-OAuth work.
          priority: JOB_PRIORITY.background,
          runAfter: now,
          coalescingKey: `incrementalPull:${resource._id}`,
        });
      }
      res.status(Status.OK).end();
    } catch (error) {
      // A storage failure is the one case worth a retry, so signal it.
      logger.error(
        `Failed to process notification for channel ${notification.channelId}`,
        redactedCause(error),
      );
      res.status(Status.INTERNAL_SERVER).end();
    }
  });
}

// Build the stored subscription verifyNotification checks against, or null when
// the channel is unknown or its subscription is not fully recorded.
function toSubscription(
  resource: SyncResourceRecord | null,
): NotificationSubscription | null {
  if (
    !resource?.subscriptionId ||
    !resource.subscriptionResourceId ||
    !resource.subscriptionToken ||
    !resource.subscriptionExpiresAt
  ) {
    return null;
  }
  return {
    channelId: resource.subscriptionId,
    resourceId: resource.subscriptionResourceId,
    token: resource.subscriptionToken,
    expiresAt: resource.subscriptionExpiresAt,
  };
}
