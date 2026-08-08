import { calendar } from "@googleapis/calendar";
import { OAuth2Client } from "google-auth-library";
import {
  type gCalendar,
  type gSchema$Calendar,
  type gSchema$CalendarListEntry,
} from "@core/types/gcal";
import {
  type CalendarAccessRole,
  type SyncCalendarCapabilities,
} from "@core/types/sync/connection.contracts";
import { GOOGLE_REQUEST_TIMEOUT_MS } from "@sync/providers/google/google-http.constants";
import {
  type CalendarDiscovery,
  type DiscoveredCalendar,
  type ProviderCalendarAdapter,
  ProviderCalendarError,
} from "@sync/providers/provider-calendar.port";
import { redactedCause } from "@sync/safety/redact-error";

// One page of a Google calendar-list read, narrowed to the fields discovery
// needs. Google returns `nextSyncToken` only on the final page; intermediate
// pages carry `nextPageToken` instead.
export interface GoogleCalendarListPage {
  readonly items: readonly gSchema$CalendarListEntry[];
  readonly nextPageToken: string | null;
  readonly nextSyncToken: string | null;
}

// One calendar's custom event-color labels, narrowed to what color resolution
// needs. An entry with no id or hex is unusable for lookup and is dropped.
export interface GoogleEventLabel {
  readonly id: string;
  readonly hex: string;
}

// The Google calls discovery makes. Depending on this narrow interface (not
// the concrete googleapis client) lets tests supply scripted pages without a
// network round-trip or module mocking.
export interface GoogleCalendarListApi {
  listPage(params: {
    pageToken?: string;
    syncToken?: string;
  }): Promise<GoogleCalendarListPage>;
  // Only calendars.get (not calendarList.list) carries labelProperties, so
  // discovery makes one extra call per calendar to resolve it. Never throws:
  // a calendar whose label fetch fails is treated as having none, since a
  // color lookup gap should never fail discovery.
  getEventLabels(calendarId: string): Promise<readonly GoogleEventLabel[]>;
}

// Built per-connection from a short-lived access token minted by credential
// custody; the token is set as the OAuth client's credential, never logged.
export type GoogleCalendarListApiFactory = (
  accessToken: string,
) => GoogleCalendarListApi;

const defaultApiFactory: GoogleCalendarListApiFactory = (accessToken) => {
  const auth = new OAuth2Client();
  auth.setCredentials({ access_token: accessToken });
  const gcal: gCalendar = calendar({
    version: "v3",
    auth,
    timeout: GOOGLE_REQUEST_TIMEOUT_MS,
  });
  return {
    async listPage({ pageToken, syncToken }) {
      const { data } = await gcal.calendarList.list({
        pageToken,
        syncToken,
        // Default false on a full list, which would silently omit hidden and
        // deleted calendars rather than let us report them inactive. Opt in so
        // discovery sees the same set an incremental (syncToken) list forces.
        showHidden: true,
        showDeleted: true,
      });
      return {
        items: data.items ?? [],
        nextPageToken: data.nextPageToken ?? null,
        nextSyncToken: data.nextSyncToken ?? null,
      };
    },
    async getEventLabels(calendarId) {
      let data: gSchema$Calendar;
      try {
        ({ data } = await gcal.calendars.get({ calendarId }));
      } catch {
        // A label-fetch failure (permissions, transient error) should never
        // fail calendar discovery — the calendar just discovers with no
        // custom colors resolvable this pass.
        return [];
      }
      return (data.labelProperties?.eventLabels ?? [])
        .filter((label): label is { id: string; backgroundColor: string } =>
          Boolean(label.id && label.backgroundColor),
        )
        .map((label) => ({ id: label.id, hex: label.backgroundColor }));
    },
  };
};

// Google implementation of the calendar-discovery port. Maps Google's calendar
// list to provider-neutral facts and follows pagination, surfacing an expired
// incremental cursor distinctly so the caller can re-list in full.
export class GoogleCalendarAdapter implements ProviderCalendarAdapter {
  readonly provider = "google" as const;

  #makeApi: GoogleCalendarListApiFactory;

  constructor(makeApi: GoogleCalendarListApiFactory = defaultApiFactory) {
    this.#makeApi = makeApi;
  }

  async discoverCalendars(input: {
    accessToken: string;
    cursor?: string;
  }): Promise<CalendarDiscovery> {
    const api = this.#makeApi(input.accessToken);
    const calendars: DiscoveredCalendar[] = [];

    // The incremental cursor applies only to the first request of a list; once
    // paging begins Google identifies the sequence by pageToken alone.
    let syncToken = input.cursor;
    let pageToken: string | undefined;
    let nextCursor: string | null = null;

    do {
      const page = await this.#listPage(api, { pageToken, syncToken });
      // Label resolution is a per-calendar network call; run a page's calendars
      // concurrently rather than paying N sequential round-trips.
      const mapped = await Promise.all(
        page.items.map((item) => mapCalendar(item, api)),
      );
      for (const calendar of mapped) {
        if (calendar) calendars.push(calendar);
      }
      pageToken = page.nextPageToken ?? undefined;
      // Only the final page carries the token; keep the newest non-null one.
      nextCursor = page.nextSyncToken ?? nextCursor;
      syncToken = undefined;
    } while (pageToken);

    return { calendars, cursor: nextCursor };
  }

  async #listPage(
    api: GoogleCalendarListApi,
    params: { pageToken?: string; syncToken?: string },
  ): Promise<GoogleCalendarListPage> {
    try {
      return await api.listPage(params);
    } catch (error) {
      // An expired syncToken (410 Gone) is not retryable with the same token:
      // the caller must drop it and re-list in full. Transient failures stay
      // retryable; durable refusals (notACalendarUser, etc.) surface as
      // discoveryFailed so dispatch can drop instead of burning the ladder.
      throw new ProviderCalendarError(
        classifyDiscoveryError(error),
        "Google rejected the calendar list read",
        { cause: discoveryFailureCause(error) },
      );
    }
  }
}

// Google's per-calendar access role, collapsed onto the provider-neutral role.
// An unknown or absent role falls back to the least authority we can assume.
const ACCESS_ROLE_BY_GOOGLE: Record<string, CalendarAccessRole> = {
  owner: "owner",
  writer: "editor",
  reader: "viewer",
  freeBusyReader: "busyOnly",
};

// Operational capabilities implied by each role. Invite ability follows write
// access — Google exposes no separate per-calendar attendee-invite flag.
const CAPABILITIES_BY_ROLE: Record<
  CalendarAccessRole,
  SyncCalendarCapabilities
> = {
  owner: {
    canReadEvents: true,
    canWriteEvents: true,
    canReadBusy: true,
    canInviteAttendees: true,
  },
  editor: {
    canReadEvents: true,
    canWriteEvents: true,
    canReadBusy: true,
    canInviteAttendees: true,
  },
  viewer: {
    canReadEvents: true,
    canWriteEvents: false,
    canReadBusy: true,
    canInviteAttendees: false,
  },
  busyOnly: {
    canReadEvents: false,
    canWriteEvents: false,
    canReadBusy: true,
    canInviteAttendees: false,
  },
};

// Map one Google calendar-list entry to provider-neutral facts. An entry
// without an id is unusable (it cannot be keyed or persisted), so it is dropped.
async function mapCalendar(
  item: gSchema$CalendarListEntry,
  api: GoogleCalendarListApi,
): Promise<DiscoveredCalendar | null> {
  if (!item.id) return null;

  const accessRole = mapAccessRole(item.accessRole);
  return {
    providerCalendarId: item.id,
    // summaryOverride is the user's rename; fall back to the shared summary,
    // then the id so the required non-empty name always holds.
    displayName: item.summaryOverride || item.summary || item.id,
    color: item.backgroundColor || null,
    eventLabels: await api.getEventLabels(item.id),
    primary: item.primary === true,
    // deleted appears in incremental results; hidden means the user removed it
    // from their list. Either makes the calendar inactive, not gone.
    active: item.deleted !== true && item.hidden !== true,
    accessRole,
    capabilities: CAPABILITIES_BY_ROLE[accessRole],
  };
}

function mapAccessRole(
  googleRole: string | null | undefined,
): CalendarAccessRole {
  return (googleRole && ACCESS_ROLE_BY_GOOGLE[googleRole]) || "busyOnly";
}

// Map a Google calendarList.list failure to a discovery-error reason. An
// expired syncToken (410 Gone) forces a full re-list; network / rate-limit /
// quota / server errors are retryable; other 4xx (including notACalendarUser)
// are durable refusals. Quota arrives as 403, so status alone cannot separate
// it from a durable 403 — same TRANSIENT_REASONS set as the watch/writer path.
function classifyDiscoveryError(
  error: unknown,
): "cursorExpired" | "transient" | "discoveryFailed" {
  const status = googleStatus(error);
  if (status === 410) return "cursorExpired";
  if (isDiscoveryTransient(error, status)) return "transient";
  return "discoveryFailed";
}

const TRANSIENT_REASONS = [
  "rateLimitExceeded",
  "userRateLimitExceeded",
  "quotaExceeded",
  "dailyLimitExceeded",
  "backendError",
  "internalError",
];

function isDiscoveryTransient(
  error: unknown,
  status: number | undefined,
): boolean {
  if (status === undefined || status === 429 || status >= 500) return true;
  return googleErrorReasons(error).some((reason) =>
    TRANSIENT_REASONS.includes(reason),
  );
}

// Like redactedCause: drop request-derived fields (bearer token on config), but
// keep the two response facts triage needs — numeric HTTP status and Google's
// machine-readable reason. Mirrors readFailureCause / watchFailureCause.
function discoveryFailureCause(error: unknown): Error | undefined {
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
