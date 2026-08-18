import { calendar, type calendar_v3 } from "@googleapis/calendar";
import { OAuth2Client } from "google-auth-library";
import { type gCalendar } from "@core/types/gcal";
import { GOOGLE_REQUEST_TIMEOUT_MS } from "@sync/providers/google/google-http.constants";
import {
  type NotificationChannel,
  type NotificationState,
  type ProviderNotification,
  type ProviderNotificationAdapter,
  ProviderNotificationError,
} from "@sync/providers/provider-notifications.port";
import { redactedCause } from "@sync/safety/redact-error";

// The two Google channel calls the adapter makes. Depending on this narrow
// interface (not the concrete googleapis client) lets tests script results and
// errors without a network round-trip or module mocking.
export interface GoogleChannelsApi {
  watchEvents(params: {
    calendarId: string;
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

// Google callback headers, lower-cased (Node lower-cases request headers).
const HEADER_CHANNEL_ID = "x-goog-channel-id";
const HEADER_CHANNEL_TOKEN = "x-goog-channel-token";
const HEADER_RESOURCE_ID = "x-goog-resource-id";
const HEADER_RESOURCE_STATE = "x-goog-resource-state";

// Google implementation of the notification port. Opens and stops push
// channels and normalizes callback headers; the authenticity check against the
// stored association is provider-neutral and lives in verifyNotification.
export class GoogleNotificationAdapter implements ProviderNotificationAdapter {
  readonly provider = "google" as const;

  #makeApi: GoogleChannelsApiFactory;
  #now: () => Date;

  constructor(
    makeApi: GoogleChannelsApiFactory = defaultApiFactory,
    now: () => Date = () => new Date(),
  ) {
    this.#makeApi = makeApi;
    this.#now = now;
  }

  async watchEvents(input: {
    accessToken: string;
    calendarId: string;
    channelId: string;
    token: string;
    callbackUrl: string;
    ttlMs?: number;
  }): Promise<NotificationChannel> {
    const api = this.#makeApi(input.accessToken);
    const expiration = this.#now().getTime() + (input.ttlMs ?? DEFAULT_TTL_MS);

    let channel: calendar_v3.Schema$Channel;
    try {
      channel = await api.watchEvents({
        calendarId: input.calendarId,
        requestBody: {
          id: input.channelId,
          type: "web_hook",
          address: input.callbackUrl,
          token: input.token,
          // Google expects an absolute expiration in epoch milliseconds.
          expiration: String(expiration),
        },
      });
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
      channelId: input.channelId,
      resourceId: channel.resourceId,
      // Google's returned expiration wins over the requested one; fall back to
      // the requested expiry only if it omitted one.
      expiresAt: parseExpiration(channel.expiration, expiration),
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

  parseCallback(
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
  // shallow logger/exception serialization only keeps one Error.cause level
  // (2026-08-07: 78 subscriptionMaintain exceptions with no status/reason).
  const cause = watchFailureCause(error);
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
  // 429 / 5xx / no HTTP response, plus Google's 403-shaped rate-limit and
  // quota reasons, are the only cases worth burning retries on. Everything
  // else is a durable refusal (403/404/other 4xx): settle and poll.
  if (isWatchTransient(error, status)) {
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
// watched, so the caller should poll instead of retrying. googleapis may put
// the errors array on the response body OR on the error object itself — check
// both, same as the event-reader path.
function isWatchUnsupported(error: unknown): boolean {
  const status = googleStatus(error);
  if (status !== 400 && status !== 403) return false;
  return googleErrorReasons(error).includes(
    "pushNotSupportedForRequestedResource",
  );
}

// Google's rate-limit and quota rejections arrive as 403, not 429, so status
// alone cannot separate them from a durable 403 refusal. Without this, a
// momentary quota blip would settle the job to polling and leave the channel
// unopened until the next bootstrap.
const TRANSIENT_REASONS = [
  "rateLimitExceeded",
  "userRateLimitExceeded",
  "quotaExceeded",
  "dailyLimitExceeded",
  "backendError",
  "internalError",
];

function isWatchTransient(error: unknown, status: number | undefined): boolean {
  if (status === undefined || status === 429 || status >= 500) return true;
  return googleErrorReasons(error).some((reason) =>
    TRANSIENT_REASONS.includes(reason),
  );
}

// Like redactedCause: drop request-derived fields (bearer token on config), but
// keep the two response facts triage needs — numeric HTTP status and Google's
// machine-readable reason. Mirrors readFailureCause on the event-reader path.
function watchFailureCause(error: unknown): Error | undefined {
  const status = googleStatus(error);
  const reason = googleErrorReasons(error)[0];
  const facts = [
    ...(status === undefined ? [] : [`HTTP ${status}`]),
    ...(reason === undefined ? [] : [`reason ${reason}`]),
  ];
  if (facts.length === 0) return redactedCause(error);
  const message = error instanceof Error ? error.message : null;
  return new Error(
    message ? `${message} (${facts.join(", ")})` : facts.join(", "),
  );
}

function googleErrorReasons(error: unknown): string[] {
  const fromBody = (
    error as {
      response?: {
        data?: { error?: { errors?: Array<{ reason?: unknown }> } };
      };
    }
  )?.response?.data?.error?.errors;
  const fromError = (error as { errors?: Array<{ reason?: unknown }> })?.errors;
  const reasons: string[] = [];
  for (const entry of [...(fromBody ?? []), ...(fromError ?? [])]) {
    if (typeof entry?.reason === "string") reasons.push(entry.reason);
  }
  return reasons;
}

function googleStatus(error: unknown): number | undefined {
  const status =
    (error as { response?: { status?: number } })?.response?.status ??
    (error as { code?: number })?.code;
  return typeof status === "number" ? status : undefined;
}
