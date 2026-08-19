import { ProviderError } from "@sync/providers/provider-error";

// A live provider push channel, as the provider reports it after a watch. The
// caller persists this association and matches inbound callbacks against it.
export interface NotificationChannel {
  // The channel id the caller chose and the provider echoes back on callbacks.
  readonly channelId: string;
  // The provider's opaque id for the watched resource, required to stop it.
  readonly resourceId: string;
  // When the channel stops delivering and must be renewed.
  readonly expiresAt: Date;
}

// What one inbound callback tells us, normalized from provider headers. It is
// untrusted until verified against the stored subscription. The provider's
// initial post-watch handshake is `initialSync`; every other state is a change
// the caller should act on.
export type NotificationState = "initialSync" | "changed";

export interface ProviderNotification {
  readonly channelId: string;
  readonly resourceId: string;
  // The secret the provider echoes back; compared to the stored token.
  readonly token: string | null;
  readonly state: NotificationState;
}

// A provider-neutral notification port. Channel lifecycle (watch/stop) and the
// provider-specific callback header shapes stay inside the adapter; the domain
// works with the normalized ProviderNotification and the verification verdict.
export interface ProviderNotificationAdapter {
  // Open a push channel: for a calendar's events when `calendarId` is given,
  // or for the account's calendar list (so a rename, add, hide, or unshare is
  // delivered without waiting for the daily rediscovery sweep) when omitted.
  // `channelId` and `token` are caller-supplied so the association is known
  // before the first callback can arrive. `ttlMs` requests a lifetime; the
  // provider may shorten it, so the returned expiry is authoritative.
  watch(input: {
    readonly accessToken: string;
    readonly calendarId?: string;
    readonly channelId: string;
    readonly token: string;
    readonly callbackUrl: string;
    readonly ttlMs?: number;
  }): Promise<NotificationChannel>;

  // Stop a channel. Idempotent: stopping an already-gone channel resolves.
  stopChannel(input: {
    readonly accessToken: string;
    readonly channelId: string;
    readonly resourceId: string;
  }): Promise<void>;
}

// Why a mutation of a channel could not complete.
export type ProviderNotificationErrorReason =
  | "watchUnsupported" // the resource cannot be watched; the caller must poll
  | "watchFailed" // durable refusal; settle and fall back to polling
  | "transient" // retryable (429 / 5xx / network); the worker backs off
  | "authorizationRevoked"; // the credential is no longer valid

export class ProviderNotificationError extends ProviderError<ProviderNotificationErrorReason> {}
