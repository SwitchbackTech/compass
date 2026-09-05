import {
  isMicrosoftTransient,
  microsoftErrorCode,
  microsoftFailureCause,
  microsoftStatus,
} from "@sync/providers/microsoft/microsoft-error";
import {
  MICROSOFT_GRAPH_BASE_URL,
  MICROSOFT_REQUEST_TIMEOUT_MS,
} from "@sync/providers/microsoft/microsoft-http.constants";
import {
  type NotificationChannel,
  type NotificationParseResult,
  type NotificationRequest,
  type ProviderNotification,
  type ProviderNotificationAdapter,
  ProviderNotificationError,
  type ProviderNotificationLifecycle,
} from "@sync/providers/provider-notifications.port";

export interface GraphSubscription {
  readonly id: string;
  readonly resource: string;
  readonly expirationDateTime: string;
}

export interface MicrosoftSubscriptionCreateBody {
  readonly changeType: string;
  readonly notificationUrl: string;
  readonly lifecycleNotificationUrl: string;
  readonly resource: string;
  readonly expirationDateTime: string;
  readonly clientState: string;
}

export interface MicrosoftSubscriptionsApi {
  createSubscription(
    body: MicrosoftSubscriptionCreateBody,
  ): Promise<GraphSubscription>;
  deleteSubscription(subscriptionId: string): Promise<void>;
}

export type MicrosoftSubscriptionsApiFactory = (
  accessToken: string,
) => MicrosoftSubscriptionsApi;

const DEFAULT_TTL_MS = 48 * 60 * 60 * 1000;
const MAX_TTL_MS = 4230 * 60 * 1000;

const defaultApiFactory: MicrosoftSubscriptionsApiFactory = (accessToken) =>
  new FetchMicrosoftSubscriptionsApi(accessToken);

export class MicrosoftNotificationAdapter
  implements ProviderNotificationAdapter
{
  #makeApi: MicrosoftSubscriptionsApiFactory;
  #now: () => Date;

  constructor(
    makeApi: MicrosoftSubscriptionsApiFactory = defaultApiFactory,
    now: () => Date = () => new Date(),
  ) {
    this.#makeApi = makeApi;
    this.#now = now;
  }

  async watch(input: {
    accessToken: string;
    calendarId?: string;
    channelId: string;
    token: string;
    callbackUrl: string;
    ttlMs?: number;
  }): Promise<NotificationChannel> {
    if (input.calendarId === undefined) {
      throw new ProviderNotificationError(
        "watchUnsupported",
        "Microsoft Graph does not support watching calendar list changes",
      );
    }

    const api = this.#makeApi(input.accessToken);
    const expirationDateTime = this.#expirationIso(input.ttlMs);
    const resource = `/me/calendars/${input.calendarId}/events`;

    let subscription: GraphSubscription;
    try {
      subscription = await api.createSubscription({
        changeType: "created,updated,deleted",
        notificationUrl: input.callbackUrl,
        lifecycleNotificationUrl: input.callbackUrl,
        resource,
        expirationDateTime,
        clientState: input.token,
      });
    } catch (error) {
      throw classifyWatchError(error);
    }

    if (!subscription.id || !subscription.resource) {
      throw new ProviderNotificationError(
        "watchFailed",
        "Microsoft returned a subscription without an id or resource",
      );
    }

    return {
      channelId: subscription.id,
      resourceId: subscription.resource,
      expiresAt: parseExpiration(
        subscription.expirationDateTime,
        expirationDateTime,
      ),
    };
  }

  async stopChannel(input: {
    accessToken: string;
    channelId: string;
    resourceId: string;
  }): Promise<void> {
    void input.resourceId;
    const api = this.#makeApi(input.accessToken);
    try {
      await api.deleteSubscription(input.channelId);
    } catch (error) {
      const status = microsoftStatus(error);
      if (status === 404) return;
      throw classifyWatchError(error);
    }
  }

  parseNotification(request: NotificationRequest): NotificationParseResult {
    return parseMicrosoftNotification(request);
  }

  #expirationIso(ttlMs?: number): string {
    const ttl = Math.min(ttlMs ?? DEFAULT_TTL_MS, MAX_TTL_MS);
    return new Date(this.#now().getTime() + ttl).toISOString();
  }
}

class FetchMicrosoftSubscriptionsApi implements MicrosoftSubscriptionsApi {
  constructor(private readonly accessToken: string) {}

  async createSubscription(
    body: MicrosoftSubscriptionCreateBody,
  ): Promise<GraphSubscription> {
    const response = await fetch(`${MICROSOFT_GRAPH_BASE_URL}/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(MICROSOFT_REQUEST_TIMEOUT_MS),
    });

    const data = (await response.json()) as GraphSubscription & {
      error?: { code?: string; message?: string };
    };

    if (!response.ok) {
      throw Object.assign(
        new Error(
          data.error?.message ?? "microsoft_subscription_create_failed",
        ),
        { response: { status: response.status, data } },
      );
    }

    return data;
  }

  async deleteSubscription(subscriptionId: string): Promise<void> {
    const response = await fetch(
      `${MICROSOFT_GRAPH_BASE_URL}/subscriptions/${encodeURIComponent(subscriptionId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${this.accessToken}` },
        signal: AbortSignal.timeout(MICROSOFT_REQUEST_TIMEOUT_MS),
      },
    );

    if (response.ok) return;

    const data = (await response.json().catch(() => ({}))) as {
      error?: { code?: string; message?: string };
    };
    throw Object.assign(
      new Error(data.error?.message ?? "microsoft_subscription_delete_failed"),
      { response: { status: response.status, data } },
    );
  }
}

interface GraphNotificationItem {
  readonly subscriptionId?: string;
  readonly clientState?: string;
  readonly resource?: string;
  readonly changeType?: string;
  readonly lifecycleEvent?: string;
}

export function parseMicrosoftNotification(
  request: NotificationRequest,
): NotificationParseResult {
  const validationToken = readValidationToken(request.query);
  if (validationToken !== null) {
    return { kind: "validation", body: validationToken };
  }

  const items = readNotificationItems(request.body);
  if (items.length === 0) return null;

  const notifications = items
    .map(mapGraphNotificationItem)
    .filter((item): item is ProviderNotification => item !== null);

  if (notifications.length === 0) return null;
  if (notifications.length === 1) return notifications[0]!;
  return { kind: "batch", notifications };
}

function readValidationToken(query: Record<string, unknown>): string | null {
  const token = query["validationToken"];
  if (typeof token !== "string" || token.length === 0) return null;
  return token;
}

function readNotificationItems(body: unknown): GraphNotificationItem[] {
  if (typeof body !== "object" || body === null) return [];
  const value = (body as { value?: unknown }).value;
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is GraphNotificationItem =>
      typeof item === "object" && item !== null,
  );
}

function mapGraphNotificationItem(
  item: GraphNotificationItem,
): ProviderNotification | null {
  const channelId = item.subscriptionId;
  const resourceId = item.resource;
  if (!channelId || !resourceId) return null;

  const lifecycle = mapLifecycleEvent(item.lifecycleEvent);
  return {
    channelId,
    resourceId,
    token: item.clientState ?? null,
    state: "changed",
    ...(lifecycle ? { lifecycle } : {}),
  };
}

function mapLifecycleEvent(
  lifecycleEvent: string | undefined,
): ProviderNotificationLifecycle | undefined {
  if (lifecycleEvent === "reauthorizationRequired") {
    return "reauthorizationRequired";
  }
  if (lifecycleEvent === "subscriptionRemoved") return "subscriptionRemoved";
  if (lifecycleEvent === "missed") return "missed";
  return undefined;
}

function parseExpiration(
  expirationDateTime: string | null | undefined,
  fallbackIso: string,
): Date {
  if (!expirationDateTime) return new Date(fallbackIso);
  const parsed = Date.parse(expirationDateTime);
  return Number.isFinite(parsed) ? new Date(parsed) : new Date(fallbackIso);
}

function classifyWatchError(error: unknown): ProviderNotificationError {
  if (error instanceof ProviderNotificationError) return error;

  const cause = microsoftFailureCause(error);
  const status = microsoftStatus(error);
  const code = microsoftErrorCode(error);
  const detail = cause?.message;

  if (status === 401) {
    return new ProviderNotificationError(
      "authorizationRevoked",
      detail ?? "Microsoft rejected the credential",
      { cause },
    );
  }
  if (isWatchUnsupported(error, status, code)) {
    return new ProviderNotificationError(
      "watchUnsupported",
      detail ?? "Microsoft does not support watching this resource",
      { cause },
    );
  }
  if (isMicrosoftTransient(error, status)) {
    return new ProviderNotificationError(
      "transient",
      detail
        ? `Microsoft watch temporarily unavailable (${detail})`
        : "Microsoft watch temporarily unavailable",
      { cause },
    );
  }
  return new ProviderNotificationError(
    "watchFailed",
    detail
      ? `Microsoft refused to open the channel (${detail})`
      : "Microsoft refused to open the channel",
    { cause },
  );
}

function isWatchUnsupported(
  error: unknown,
  status: number | undefined,
  code: string | undefined,
): boolean {
  if (status !== 400) return false;
  if (code === "ExtensionError") return true;
  const data = (
    error as { response?: { data?: { error?: { code?: string } } } }
  )?.response?.data?.error?.code;
  return data === "ExtensionError";
}
