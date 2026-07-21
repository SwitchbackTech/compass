import {
  type NotificationSubscription,
  type ProviderNotification,
} from "@sync/providers/provider-notifications.port";
import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";

// The outcome of checking one inbound callback against the stored association.
// A rejected callback is dropped and never triggers work; an accepted one may
// still be a no-op handshake rather than a real change.
export type NotificationVerdict =
  | { readonly status: "process" } // authentic change: the caller should sync
  | { readonly status: "ignore" } // authentic, but nothing to do (handshake)
  | { readonly status: "rejected"; readonly reason: NotificationRejectReason };

export type NotificationRejectReason =
  | "unknownChannel" // no stored subscription for this channel id
  | "tokenMismatch" // the callback's token does not match the stored one
  | "resourceMismatch" // the callback names a different resource than stored
  | "expired"; // the subscription has lapsed; a fresh channel is required

// Verify an inbound callback against the subscription the caller loaded for its
// channel id (null if none was found). Every mismatch is a rejection, so a
// spoofed or stale callback can never reach the sync path. The token is
// compared in length-constant time so a mismatch reveals nothing by timing.
export function verifyNotification(
  notification: ProviderNotification,
  subscription: NotificationSubscription | null,
  now: Date = new Date(),
): NotificationVerdict {
  if (!subscription || subscription.channelId !== notification.channelId) {
    return { status: "rejected", reason: "unknownChannel" };
  }
  if (
    notification.token === null ||
    !constantTimeEquals(notification.token, subscription.token)
  ) {
    return { status: "rejected", reason: "tokenMismatch" };
  }
  if (notification.resourceId !== subscription.resourceId) {
    return { status: "rejected", reason: "resourceMismatch" };
  }
  if (subscription.expiresAt.getTime() <= now.getTime()) {
    return { status: "rejected", reason: "expired" };
  }

  // The initial "sync" handshake fires once right after a watch and carries no
  // change; only a real change should drive a pull.
  return notification.state === "changed"
    ? { status: "process" }
    : { status: "ignore" };
}

// Compare two tokens without short-circuiting on the first differing byte, so a
// spoofed token cannot be recovered by measuring response time. Equal length is
// a precondition of timingSafeEqual; a wrong-length token is trivially invalid
// and its length is not itself a secret. Mirrors internal-auth's HMAC compare.
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
