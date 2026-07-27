import { type AccessTokenSource } from "@sync/domain/provider-command.service";
import {
  type ProviderNotificationAdapter,
  ProviderNotificationError,
} from "@sync/providers/provider-notifications.port";
import { type ProviderCalendarRecord } from "@sync/storage/contracts/provider-calendar.contracts";
import { type SyncResourceRecord } from "@sync/storage/contracts/sync-resource.contracts";
import { type SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";
import { randomUUID } from "node:crypto";

export interface SubscriptionMaintenanceDeps {
  resources: SyncResourceRepository;
  notifications: ProviderNotificationAdapter;
  custody: AccessTokenSource;
  // The absolute URL provider callbacks post back to (config's callback base +
  // the notifications route). Passed to the provider on watch; the callback then
  // arrives here and is matched to the stored subscription.
  callbackUrl: string;
}

export interface SubscriptionMaintenanceOptions {
  // Replace a subscription once it is within this window of expiring, so a
  // channel is renewed before it lapses and pushes never gap. A subscription
  // with more than this much life left is left alone.
  renewBeforeMs?: number;
}

export type SubscriptionMaintenanceOutcome =
  // A first channel was opened for a resource that had none.
  | { readonly status: "watched" }
  // An existing channel near expiry was replaced (and the old one stopped).
  | { readonly status: "renewed" }
  // The existing channel still has ample life; nothing was changed.
  | { readonly status: "current" }
  // The provider cannot push for this calendar; any stale channel was cleared
  // and the caller must rely on polling (the reconcile sweep) instead.
  | { readonly status: "unsupported" }
  // The credential is no longer valid; a reconnect re-bootstraps the channel, so
  // there is nothing to do here and retrying will not help.
  | { readonly status: "authRevoked" };

// One day. Google event channels last about a week, so renewing a full day
// ahead leaves generous margin over any reasonable maintenance cadence.
const DEFAULT_RENEW_BEFORE_MS = 24 * 60 * 60 * 1000;

// Ensure a calendar's events resource has a live push channel: open one if it
// has none, or replace one that is near expiry. The new channel is persisted
// BEFORE the old one is stopped, so a callback is always matchable — the reverse
// order would open a window where neither the old nor the new channel delivers.
//
// Idempotent enough to run twice: a resource whose channel still has plenty of
// life reports "current" and touches nothing, so a redundant maintain job (a
// racing sweep, a re-run after a crash) does not churn the channel.
//
// A transient watch failure throws so the worker retries with backoff. Only the
// terminal provider verdicts are folded into an outcome: an unwatchable resource
// ("unsupported") falls back to polling, and a revoked credential ("authRevoked")
// waits for a reconnect. Both settle the job rather than retry forever.
export async function maintainSubscription(
  deps: SubscriptionMaintenanceDeps,
  calendar: ProviderCalendarRecord,
  resource: SyncResourceRecord,
  now: () => Date,
  options: SubscriptionMaintenanceOptions = {},
): Promise<SubscriptionMaintenanceOutcome> {
  const renewBeforeMs = options.renewBeforeMs ?? DEFAULT_RENEW_BEFORE_MS;

  // Skip a healthy channel with more than the renew window left. A channel with
  // an id but no recorded expiry is treated as needing renewal (fail safe).
  if (
    resource.subscriptionId &&
    resource.subscriptionExpiresAt &&
    resource.subscriptionExpiresAt.getTime() - now().getTime() > renewBeforeMs
  ) {
    return { status: "current" };
  }

  const accessToken = await deps.custody.getValidAccessToken(
    calendar.connectionId,
  );

  // The channel id and per-channel token are chosen here so the association is
  // known before the provider can deliver the first callback. The token is a
  // secret the provider echoes back and verifyNotification compares.
  const channelId = randomUUID();
  const channelToken = randomUUID();

  let channel: Awaited<ReturnType<ProviderNotificationAdapter["watchEvents"]>>;
  try {
    channel = await deps.notifications.watchEvents({
      accessToken,
      calendarId: calendar.providerCalendarId,
      channelId,
      token: channelToken,
      callbackUrl: deps.callbackUrl,
    });
  } catch (error) {
    if (error instanceof ProviderNotificationError) {
      if (error.reason === "watchUnsupported") {
        // This calendar can never be watched; drop any stale channel so a
        // lingering subscription id does not misroute a future callback, and let
        // polling cover it.
        if (resource.subscriptionId) {
          await deps.resources.clearSubscription(
            resource.tenantId,
            resource.principalId,
            resource._id,
          );
        }
        return { status: "unsupported" };
      }
      if (error.reason === "authorizationRevoked") {
        await deps.custody.discardRevoked(calendar.connectionId);
        return { status: "authRevoked" };
      }
    }
    // watchFailed or anything unexpected: transient, let the worker retry.
    throw error;
  }

  const priorChannelId = resource.subscriptionId;
  const priorResourceId = resource.subscriptionResourceId;

  // Persist the new channel first so its callbacks verify immediately.
  await deps.resources.updateSubscription(
    resource.tenantId,
    resource.principalId,
    resource._id,
    {
      subscriptionId: channel.channelId,
      subscriptionResourceId: channel.resourceId,
      subscriptionToken: channelToken,
      subscriptionExpiresAt: channel.expiresAt,
    },
  );

  if (priorChannelId && priorResourceId) {
    // Best effort: the new channel is already live and stored, so a failure to
    // stop the old one is not fatal — it lapses on its own, and its callbacks no
    // longer match the stored subscription so they are ignored meanwhile.
    try {
      await deps.notifications.stopChannel({
        accessToken,
        channelId: priorChannelId,
        resourceId: priorResourceId,
      });
    } catch {
      // Swallow: the stale channel expires without our help.
    }
    return { status: "renewed" };
  }

  return { status: "watched" };
}
