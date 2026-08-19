import { calendar, type calendar_v3 } from "@googleapis/calendar";
import { OAuth2Client } from "google-auth-library";
import { type gCalendar } from "@core/types/gcal";
import {
  googleErrorReasons,
  googleFailureCause,
  googleStatus,
  isGoogleTransient,
} from "@sync/providers/google/google-error";
import { GOOGLE_REQUEST_TIMEOUT_MS } from "@sync/providers/google/google-http.constants";
import {
  type NotificationChannel,
  type NotificationState,
  type ProviderNotification,
  type ProviderNotificationAdapter,
  ProviderNotificationError,
} from "@sync/providers/provider-notifications.port";

// The two Google channel calls the adapter makes. Depending on this narrow
// interface (not the concrete googleapis client) lets tests script results and
// errors without a network round-trip or module mocking.
export interface GoogleChannelsApi {
  watchEvents(params: {
    calendarId: string;
    requestBody: calendar_v3.Schema$Channel;
  }): Promise<calendar_v3.Schema$Channel>;
  watchCalendarList(params: {
    requestBody: calendar_v3.Schema$Channel;
  }): Promise<calendar_v3.Schema$Channel>;
  stopChannel(params: {
    requestBody: calendar_v3.Schema$Channel;
  }): Promise<void>;
}

export type GoogleChannelsApiFactory = (
  accessToken: string,
) => GoogleChannelsApi;

const defaultApiFactory: GoogleChannelsApiFactory = (accessToken) => {
  const auth = new OAuth2Client();
  auth.setCredentials({ access_token: accessToken });
  const gcal: gCalendar = calendar({
    version: "v3",
    auth,
    timeout: GOOGLE_REQUEST_TIMEOUT_MS,
  });
  return {
    async watchEvents({ calendarId, requestBody }) {
      const { data } = await gcal.events.watch({ calendarId, requestBody });
      return data;
    },
    async watchCalendarList({ requestBody }) {
      const { data } = await gcal.calendarList.watch({ requestBody });
      return data;
    },
    async stopChannel({ requestBody }) {
      await gcal.channels.stop({ requestBody });
    },
  };
};

// A default channel lifetime when the caller requests none. Google caps event
// channels near a week; it may return a shorter expiry, which is authoritative.
//
// Deliberately 48h rather than the week Google allows. A channel can stop
// delivering without expiring — Google drops one whose callbacks keep failing,
// and nothing about that reaches us — and the renewal sweep only ever selects
// on subscriptionExpiresAt, so a dead-but-unexpired channel is invisible to
// every liveness path we have. Pairing a 48h lifetime with the 24h renew-before
// guard means the sweep replaces every channel about once a day, which bounds
// that blind window to a day instead of a week. The cost is one extra
// events.watch per calendar per day, well inside Google's quota, and
// maintainSubscription persists the replacement BEFORE stopping the old channel
// so a renewal never opens a delivery gap.
const DEFAULT_TTL_MS = 48 * 60 * 60 * 1000;

function channelBody(
  input: {
    channelId: string;
    token: string;
    callbackUrl: string;
  },
  expirationMs: number,
): calendar_v3.Schema$Channel {
  return {
    id: input.channelId,
    type: "web_hook",
    address: input.callbackUrl,
    token: input.token,
    // Google expects an absolute expiration in epoch milliseconds.
    expiration: String(expirationMs),
  };
}

// Google callback headers, lower-cased (Node lower-cases request headers).
const HEADER_CHANNEL_ID = "x-goog-channel-id";
const HEADER_CHANNEL_TOKEN = "x-goog-channel-token";
const HEADER_RESOURCE_ID = "x-goog-resource-id";
const HEADER_RESOURCE_STATE = "x-goog-resource-state";

// Google implementation of the notification port. Opens and stops push
// channels and normalizes callback headers; the authenticity check against the
// stored association is provider-neutral and lives in verifyNotification.
export class GoogleNotificationAdapter implements ProviderNotificationAdapter {
  #makeApi: GoogleChannelsApiFactory;
  #now: () => Date;

  constructor(
    makeApi: GoogleChannelsApiFactory = defaultApiFactory,
    now: () => Date = () => new Date(),
  ) {
    this.#makeApi = makeApi;
    this.#now = now;
  }

  // Events watch when `calendarId` is given, calendar-list watch when omitted.
  async watch(input: {
    accessToken: string;
    calendarId?: string;
    channelId: string;
    token: string;
    callbackUrl: string;
    ttlMs?: number;
  }): Promise<NotificationChannel> {
    const api = this.#makeApi(input.accessToken);
    const expirationMs = this.#expirationMs(input.ttlMs);
    const requestBody = channelBody(input, expirationMs);
    return this.#openChannel(
      () =>
        input.calendarId === undefined
          ? api.watchCalendarList({ requestBody })
          : api.watchEvents({ calendarId: input.calendarId, requestBody }),
      input.channelId,
      expirationMs,
    );
  }

  #expirationMs(ttlMs?: number): number {
    return this.#now().getTime() + (ttlMs ?? DEFAULT_TTL_MS);
  }

  async #openChannel(
    watch: () => Promise<calendar_v3.Schema$Channel>,
    channelId: string,
    expirationMs: number,
  ): Promise<NotificationChannel> {
    let channel: calendar_v3.Schema$Channel;
    try {
      channel = await watch();
    } catch (error) {
      throw classifyWatchError(error);
    }

    if (!channel.resourceId) {
      throw new ProviderNotificationError(
        "watchFailed",
        "Google returned a channel without a resource id",
      );
    }
    return {
      channelId,
      resourceId: channel.resourceId,
      // Google's returned expiration wins over the requested one; fall back to
      // the requested expiry only if it omitted one.
      expiresAt: parseExpiration(channel.expiration, expirationMs),
    };
  }

  async stopChannel(input: {
    accessToken: string;
    channelId: string;
    resourceId: string;
  }): Promise<void> {
    const api = this.#makeApi(input.accessToken);
    try {
      await api.stopChannel({
        requestBody: { id: input.channelId, resourceId: input.resourceId },
      });
    } catch (error) {
      // A channel that is already gone (or whose authority lapsed) cannot be
      // stopped and needs no stopping — treat it as done. Other failures are
      // surfaced so a caller can retry.
      const status = googleStatus(error);
      if (status === 404 || status === 401 || status === 410) return;
      throw classifyWatchError(error);
    }
  }
}

// Normalize Google callback headers into a ProviderNotification, or null if
// the headers are not a recognizable notification at all. Pure header parsing
// — no network, no auth — so it lives outside the adapter class.
export function parseGoogleNotification(
  headers: Record<string, string | undefined>,
): ProviderNotification | null {
  const channelId = headers[HEADER_CHANNEL_ID];
  const resourceId = headers[HEADER_RESOURCE_ID];
  // Without a channel and resource to match, there is nothing to verify.
  if (!channelId || !resourceId) return null;

  return {
    channelId,
    resourceId,
    token: headers[HEADER_CHANNEL_TOKEN] ?? null,
    state: mapState(headers[HEADER_RESOURCE_STATE]),
  };
}

// Google's initial post-watch delivery is "sync"; every other state ("exists",
// "not_exists", ...) signals a change the caller should act on.
function mapState(resourceState: string | undefined): NotificationState {
  return resourceState === "sync" ? "initialSync" : "changed";
}

function parseExpiration(
  expiration: string | null | undefined,
  fallbackMs: number,
): Date {
  if (!expiration) return new Date(fallbackMs);
  const parsed = Number(expiration);
  return Number.isFinite(parsed) ? new Date(parsed) : new Date(fallbackMs);
}

function classifyWatchError(error: unknown): ProviderNotificationError {
  if (error instanceof ProviderNotificationError) return error;
  // Keep HTTP status + Google's machine-readable reason on the cause/message
  // so PostHog triage is not guesswork — redactedCause alone drops both, and
  // shallow logger/exception serialization only keeps one Error.cause level.
  const cause = googleFailureCause(error);
  const status = googleStatus(error);
  const detail = cause?.message;

  if (status === 401) {
    return new ProviderNotificationError(
      "authorizationRevoked",
      detail ?? "Google rejected the credential",
      { cause },
    );
  }
  if (isWatchUnsupported(error)) {
    return new ProviderNotificationError(
      "watchUnsupported",
      detail ?? "Google does not support watching this resource",
      { cause },
    );
  }
  // Everything not transient is a durable refusal (403/404/other 4xx):
  // settle and poll.
  if (isGoogleTransient(error, status)) {
    return new ProviderNotificationError(
      "transient",
      detail
        ? `Google watch temporarily unavailable (${detail})`
        : "Google watch temporarily unavailable",
      { cause },
    );
  }
  return new ProviderNotificationError(
    "watchFailed",
    detail
      ? `Google refused to open the channel (${detail})`
      : "Google refused to open the channel",
    { cause },
  );
}

// A 400 (or, per observed Google behavior, 403) whose reason is
// pushNotSupportedForRequestedResource means the resource can never be
// watched, so the caller should poll instead of retrying.
function isWatchUnsupported(error: unknown): boolean {
  const status = googleStatus(error);
  if (status !== 400 && status !== 403) return false;
  return googleErrorReasons(error).includes(
    "pushNotSupportedForRequestedResource",
  );
}
