import { calendar } from "@googleapis/calendar";
import { OAuth2Client } from "google-auth-library";
import {
  type gCalendar,
  type gSchema$CalendarListEntry,
} from "@core/types/gcal";
import {
  type CalendarAccessRole,
  type CalendarCapabilities,
} from "@core/types/sync/connection.contracts";
import {
  type CalendarDiscovery,
  type DiscoveredCalendar,
  type ProviderCalendarAdapter,
  ProviderCalendarError,
} from "@sync/providers/provider-calendar.port";

// One page of a Google calendar-list read, narrowed to the fields discovery
// needs. Google returns `nextSyncToken` only on the final page; intermediate
// pages carry `nextPageToken` instead.
export interface GoogleCalendarListPage {
  readonly items: readonly gSchema$CalendarListEntry[];
  readonly nextPageToken: string | null;
  readonly nextSyncToken: string | null;
}

// The one Google call discovery makes. Depending on this narrow interface (not
// the concrete googleapis client) lets tests supply scripted pages without a
// network round-trip or module mocking.
export interface GoogleCalendarListApi {
  listPage(params: {
    pageToken?: string;
    syncToken?: string;
  }): Promise<GoogleCalendarListPage>;
}

// Built per-connection from a short-lived access token minted by credential
// custody; the token is set as the OAuth client's credential, never logged.
export type GoogleCalendarListApiFactory = (
  accessToken: string,
) => GoogleCalendarListApi;

const defaultApiFactory: GoogleCalendarListApiFactory = (accessToken) => {
  const auth = new OAuth2Client();
  auth.setCredentials({ access_token: accessToken });
  const gcal: gCalendar = calendar({ version: "v3", auth });
  return {
    async listPage({ pageToken, syncToken }) {
      const { data } = await gcal.calendarList.list({ pageToken, syncToken });
      return {
        items: data.items ?? [],
        nextPageToken: data.nextPageToken ?? null,
        nextSyncToken: data.nextSyncToken ?? null,
      };
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
      for (const item of page.items) {
        const mapped = mapCalendar(item);
        if (mapped) calendars.push(mapped);
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
const CAPABILITIES_BY_ROLE: Record<CalendarAccessRole, CalendarCapabilities> = {
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
function mapCalendar(
  item: gSchema$CalendarListEntry,
): DiscoveredCalendar | null {
  if (!item.id) return null;

  const accessRole = mapAccessRole(item.accessRole);
  return {
    providerCalendarId: item.id,
    // summaryOverride is the user's rename; fall back to the shared summary,
    // then the id so the required non-empty name always holds.
    displayName: item.summaryOverride || item.summary || item.id,
    color: item.backgroundColor || null,
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

// Reduce a provider-SDK error to a bare message before attaching it as a cause.
// A googleapis/gaxios error retains the full request config, whose headers carry
// the bearer access token; propagating the raw object would leak that token the
// moment any caller logs the cause chain. The message is response-derived, so it
// is safe to keep for diagnostics. (Mirrors the auth adapter's redaction.)
function redactedCause(error: unknown): Error | undefined {
  return error instanceof Error ? new Error(error.message) : undefined;
}
