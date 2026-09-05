import { Logger } from "@core/logger/winston.logger";
import { syncHorizon } from "@sync/domain/horizon";
import {
  isMicrosoftTransient,
  microsoftErrorCode,
  microsoftFailureCause,
  microsoftStatus,
} from "@sync/providers/microsoft/microsoft-error";
import {
  type GraphEvent,
  normalizeMicrosoftEvent,
} from "@sync/providers/microsoft/microsoft-event.normalizer";
import {
  MICROSOFT_EVENT_PAGE_SIZE,
  MICROSOFT_EVENT_SELECT,
  MICROSOFT_GRAPH_BASE_URL,
  MICROSOFT_REQUEST_TIMEOUT_MS,
} from "@sync/providers/microsoft/microsoft-http.constants";
import { ProviderEventError } from "@sync/providers/provider-event.port";
import {
  type EventWindow,
  type ProviderEventPage,
  ProviderEventReadError,
  type ProviderEventReader,
  type ProviderEventReadInput,
} from "@sync/providers/provider-event-reader.port";

export interface GraphEventDeltaItem extends GraphEvent {
  readonly ["@removed"]?: { readonly reason?: string };
}

export interface MicrosoftEventListPage {
  readonly items: readonly GraphEventDeltaItem[];
  readonly nextLink: string | null;
  readonly deltaLink: string | null;
}

export interface MicrosoftEventListApi {
  listPage(params: {
    calendarId: string;
    window?: EventWindow | null;
    deltaLink?: string;
    pageLink?: string;
    strategy?: MicrosoftEventListStrategy;
  }): Promise<MicrosoftEventListPage>;
}

export type MicrosoftEventListApiFactory = (
  accessToken: string,
) => MicrosoftEventListApi;

export type MicrosoftEventListStrategy = "events" | "calendarView";

const logger = Logger("sync:microsoft-event-reader");

const defaultApiFactory: MicrosoftEventListApiFactory = (accessToken) =>
  new FetchMicrosoftEventListApi(accessToken);

// Microsoft Graph implementation of the event-read port. Reads one page of a
// calendar's events through events/delta (masters and exceptions, never
// occurrences) or, when a bounded window needs an end date, calendarView/delta.
export class MicrosoftEventReaderAdapter implements ProviderEventReader {
  #makeApi: MicrosoftEventListApiFactory;
  #log: { warn: (message: string) => void };

  constructor(
    makeApi: MicrosoftEventListApiFactory = defaultApiFactory,
    log?: { warn: (message: string) => void },
  ) {
    this.#makeApi = makeApi;
    this.#log = log ?? logger;
  }

  async listEventPage(
    input: ProviderEventReadInput,
  ): Promise<ProviderEventPage> {
    const api = this.#makeApi(input.accessToken);
    const page = await this.#listPage(api, {
      calendarId: input.calendarId,
      window: input.window ?? null,
      deltaLink: input.cursor ?? undefined,
      pageLink: input.pageToken ?? undefined,
      strategy: resolveListStrategy(input),
    });

    const events = [];
    let skipped = 0;
    for (const item of page.items) {
      if (item["@removed"]) {
        if (!item.id) {
          skipped++;
          this.#log.warn(
            "Skipped unusable Microsoft removal row (missingIdentity)",
          );
          continue;
        }
        events.push({
          kind: "cancellation" as const,
          providerEventId: item.id,
          providerVersion: "",
          series: null,
        });
        continue;
      }

      if (item.type === "occurrence") {
        skipped++;
        this.#log.warn(
          `Skipped Microsoft occurrence row ${item.id ?? "(no id)"} (unmappableContent)`,
        );
        continue;
      }

      try {
        events.push(
          normalizeMicrosoftEvent(item, input.colorLabels ?? new Map()),
        );
      } catch (error) {
        if (error instanceof ProviderEventError) {
          skipped++;
          this.#log.warn(
            `Skipped unusable Microsoft event ${item.id ?? "(no id)"} (${error.reason})`,
          );
          continue;
        }
        throw error;
      }
    }

    return {
      events,
      skipped,
      nextPageToken: page.nextLink,
      nextSyncToken: page.deltaLink,
    };
  }

  async #listPage(
    api: MicrosoftEventListApi,
    params: Parameters<MicrosoftEventListApi["listPage"]>[0],
  ): Promise<MicrosoftEventListPage> {
    try {
      return await api.listPage(params);
    } catch (error) {
      throw new ProviderEventReadError(
        classifyReadError(error),
        "Microsoft rejected the events delta read",
        { cause: microsoftFailureCause(error) },
      );
    }
  }
}

function resolveListStrategy(
  input: ProviderEventReadInput,
): MicrosoftEventListStrategy {
  if (input.cursor || input.pageToken) return "events";
  if (input.window?.timeMin && input.window.timeMax) return "calendarView";
  return "events";
}

function classifyReadError(
  error: unknown,
): "cursorExpired" | "authExpired" | "transient" | "readFailed" {
  const status = microsoftStatus(error);
  const code = microsoftErrorCode(error);
  if (status === 410 || code === "syncStateNotFound") return "cursorExpired";
  if (status === 401) return "authExpired";
  if (status === 429 || isMicrosoftTransient(error, status)) return "transient";
  if (status !== undefined && status >= 400 && status < 500) {
    return "readFailed";
  }
  return "transient";
}

class FetchMicrosoftEventListApi implements MicrosoftEventListApi {
  #accessToken: string;

  constructor(accessToken: string) {
    this.#accessToken = accessToken;
  }

  async listPage(
    params: Parameters<MicrosoftEventListApi["listPage"]>[0],
  ): Promise<MicrosoftEventListPage> {
    const url = resolveRequestUrl(params);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.#accessToken}`,
        Prefer: `odata.maxpagesize=${MICROSOFT_EVENT_PAGE_SIZE}, outlook.timezone="UTC"`,
      },
      signal: AbortSignal.timeout(MICROSOFT_REQUEST_TIMEOUT_MS),
    });

    const data = (await response.json()) as {
      value?: GraphEventDeltaItem[];
      "@odata.nextLink"?: string;
      "@odata.deltaLink"?: string;
      error?: { code?: string; message?: string };
    };

    if (!response.ok) {
      throw Object.assign(
        new Error(data.error?.message ?? "microsoft_event_delta_failed"),
        { response: { status: response.status, data } },
      );
    }

    return {
      items: data.value ?? [],
      nextLink: data["@odata.nextLink"] ?? null,
      deltaLink: data["@odata.deltaLink"] ?? null,
    };
  }
}

function resolveRequestUrl(
  params: Parameters<MicrosoftEventListApi["listPage"]>[0],
): string {
  if (params.pageLink) return params.pageLink;
  if (params.deltaLink) return params.deltaLink;

  const calendarId = encodeURIComponent(params.calendarId);
  if (params.strategy === "calendarView") {
    const window = requireWindow(params.window);
    const query = new URLSearchParams({
      startDateTime: window.timeMin,
      endDateTime: window.timeMax,
    });
    return `${MICROSOFT_GRAPH_BASE_URL}/me/calendars/${calendarId}/calendarView/delta?${query}`;
  }

  const query = new URLSearchParams({
    $select: MICROSOFT_EVENT_SELECT,
    startDateTime: resolveStartDateTime(params.window),
  });
  return `${MICROSOFT_GRAPH_BASE_URL}/me/calendars/${calendarId}/events/delta?${query}`;
}

function requireWindow(window: EventWindow | null | undefined): EventWindow {
  if (!window?.timeMin || !window.timeMax) {
    throw new Error("calendarView delta requires a bounded window");
  }
  return window;
}

function resolveStartDateTime(window: EventWindow | null | undefined): string {
  if (window?.timeMin) return window.timeMin;
  return syncHorizon(new Date()).start.toISOString();
}
