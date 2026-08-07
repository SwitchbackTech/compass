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
      // the caller must drop it and re-list in full. Everything else is a
      // generic discovery failure.
      throw new ProviderCalendarError(
        isCursorExpired(error) ? "cursorExpired" : "discoveryFailed",
        "Google rejected the calendar list read",
        { cause: redactedCause(error) },
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

// Google signals an expired calendar-list syncToken with HTTP 410 Gone. The
// status lives on the response, so reading it does not touch the request.
function isCursorExpired(error: unknown): boolean {
  const status =
    (error as { response?: { status?: number } })?.response?.status ??
    (error as { code?: number })?.code;
  return status === 410;
}
