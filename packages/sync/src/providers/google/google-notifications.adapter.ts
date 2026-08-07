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
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
  const cause = redactedCause(error);
  if (googleStatus(error) === 401) {
    return new ProviderNotificationError(
      "authorizationRevoked",
      "Google rejected the credential",
      { cause },
    );
  }
  if (isWatchUnsupported(error)) {
    return new ProviderNotificationError(
      "watchUnsupported",
      "Google does not support watching this resource",
      { cause },
    );
  }
  return new ProviderNotificationError(
    "watchFailed",
    "Google refused to open the channel",
    { cause },
  );
}

// A 400 (or, per observed Google behavior, 403) whose reason is
// pushNotSupportedForRequestedResource means the resource can never be
// watched, so the caller should poll instead of retrying. 403 is also used for
// rateLimitExceeded/userRateLimitExceeded/quotaExceeded, which ARE transient —
// this stays gated on the specific reason string, not on status alone.
function isWatchUnsupported(error: unknown): boolean {
  const status = googleStatus(error);
  if (status !== 400 && status !== 403) return false;
  const errors = (
    error as {
      response?: { data?: { error?: { errors?: Array<{ reason?: string }> } } };
    }
  )?.response?.data?.error?.errors;
  return Boolean(
    errors?.some((e) => e.reason === "pushNotSupportedForRequestedResource"),
  );
}

function googleStatus(error: unknown): number | undefined {
  return (
    (error as { response?: { status?: number } })?.response?.status ??
    (error as { code?: number })?.code
  );
}
