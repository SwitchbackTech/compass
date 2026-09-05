import { type EventSchedule } from "@core/types/event.contracts";
import { type Attendee } from "@core/types/event-attendance.contracts";
import { type SyncEventContent } from "@core/types/sync/event.contracts";
import dayjs from "@core/util/date/dayjs";
import {
  isMicrosoftTransient,
  microsoftFailureCause,
  microsoftStatus,
} from "@sync/providers/microsoft/microsoft-error";
import {
  type GraphEvent,
  mapConference,
  normalizeMicrosoftEvent,
} from "@sync/providers/microsoft/microsoft-event.normalizer";
import {
  MICROSOFT_EVENT_SELECT,
  MICROSOFT_GRAPH_BASE_URL,
  MICROSOFT_REQUEST_TIMEOUT_MS,
} from "@sync/providers/microsoft/microsoft-http.constants";
import { fromRRule } from "@sync/providers/microsoft/microsoft-recurrence";
import { UnsupportedRecurrenceError } from "@sync/providers/microsoft/microsoft-recurrence.error";
import {
  type GraphPatternedRecurrence,
  type MicrosoftRecurrenceWriteContext,
} from "@sync/providers/microsoft/microsoft-recurrence.types";
import {
  ProviderEventError,
  type ProviderEventRead,
} from "@sync/providers/provider-event.port";
import {
  type InvitationIntent,
  type ProviderCreateInput,
  type ProviderDeleteInput,
  type ProviderEventWriter,
  type ProviderFetchInput,
  type ProviderInstanceFetchInput,
  type ProviderPatchInput,
  ProviderWriteError,
  type ProviderWriteRecurrence,
  type ProviderWriteResult,
} from "@sync/providers/provider-event-writer.port";
import { redactedCause } from "@sync/safety/redact-error";

const GRAPH_DATETIME = "YYYY-MM-DD[T]HH:mm:ss.SSS";

// Graph attendee response values Compass writes back on a guest-list edit.
const COMPASS_TO_GRAPH_RESPONSE: Readonly<
  Record<Attendee["responseStatus"], string>
> = {
  accepted: "accepted",
  declined: "declined",
  tentative: "tentativelyAccepted",
  needsAction: "notResponded",
};

interface GraphAttendeeWrite {
  readonly type: "required";
  readonly emailAddress: {
    readonly address: string;
    readonly name?: string;
  };
  readonly status?: { readonly response: string };
}

export interface GraphEventWriteBody {
  readonly subject?: string;
  readonly body?: { readonly contentType: "text"; readonly content: string };
  readonly location?: { readonly displayName: string };
  readonly start?: { readonly dateTime: string; readonly timeZone: "UTC" };
  readonly end?: { readonly dateTime: string; readonly timeZone: "UTC" };
  readonly isAllDay?: boolean;
  readonly showAs?: "free" | "busy" | "tentative" | "oof" | "workingElsewhere";
  readonly recurrence?: GraphPatternedRecurrence | null;
  readonly attendees?: readonly GraphAttendeeWrite[];
  readonly responseRequested?: boolean;
  readonly transactionId?: string;
  readonly isOnlineMeeting?: boolean;
  readonly onlineMeetingProvider?: string;
}

export interface GraphCalendarMeetingInfo {
  readonly allowedOnlineMeetingProviders?: readonly string[];
  readonly defaultOnlineMeetingProvider?: string;
}

const TEAMS_ONLINE_MEETING_PROVIDERS = new Set([
  "teamsForBusiness",
  "teamsForConsumer",
]);

const MEETING_PROVIDER_CACHE_TTL_MS = 5 * 60 * 1000;

const CALENDAR_MEETING_SELECT =
  "allowedOnlineMeetingProviders,defaultOnlineMeetingProvider";

export interface MicrosoftEventWriteApi {
  create(params: {
    calendarId: string;
    body: GraphEventWriteBody;
  }): Promise<GraphEvent>;
  patch(params: {
    eventId: string;
    body: GraphEventWriteBody;
    ifMatch: string | null;
  }): Promise<GraphEvent>;
  delete(params: { eventId: string; ifMatch: string | null }): Promise<void>;
  get(params: { eventId: string }): Promise<GraphEvent>;
  getCalendar(): Promise<GraphCalendarMeetingInfo>;
  listInstances(params: {
    seriesEventId: string;
    startDateTime: string;
    endDateTime: string;
  }): Promise<readonly GraphEvent[]>;
}

export type MicrosoftEventWriteApiFactory = (
  accessToken: string,
) => MicrosoftEventWriteApi;

const defaultApiFactory: MicrosoftEventWriteApiFactory = (accessToken) =>
  new FetchMicrosoftEventWriteApi(accessToken);

// Microsoft Graph implementation of the event mutation port. Create is
// idempotent via transactionId, patch and delete can be conditioned on etag,
// and provider errors are classified into neutral, caller-actionable reasons.
// createConference reads the mailbox's allowed online-meeting providers and
// asks Graph for Teams when one is available; fetchInstanceAt lists one day
// of /instances and picks the occurrence whose originalStart matches.
//
// Named wart: Graph sends attendee mail on create and on attendee changes even
// when responseRequested is false (invitation "none"). Compass honors "none" by
// setting responseRequested false, but Outlook may still notify attendees.
export class MicrosoftEventWriter implements ProviderEventWriter {
  #makeApi: MicrosoftEventWriteApiFactory;
  #meetingProviders = new Map<
    string,
    { readonly expiresAt: number; readonly teamsProvider: string | null }
  >();

  constructor(makeApi: MicrosoftEventWriteApiFactory = defaultApiFactory) {
    this.#makeApi = makeApi;
  }

  async createEvent(input: ProviderCreateInput): Promise<ProviderWriteResult> {
    const api = this.#makeApi(input.accessToken);
    try {
      const teamsProvider = input.createConference
        ? await this.#resolveTeamsProvider(api, input.accessToken)
        : null;
      const body = {
        ...toGraphCreateBody(input),
        ...(teamsProvider
          ? {
              isOnlineMeeting: true,
              onlineMeetingProvider: teamsProvider,
            }
          : {}),
      };
      const created = await api.create({
        calendarId: input.calendarId,
        body,
      });
      const result = toResult(created);
      if (input.createConference) {
        return { ...result, conference: result.conference ?? null };
      }
      return result;
    } catch (error) {
      throw classifyWriteError(error);
    }
  }

  async patchEvent(input: ProviderPatchInput): Promise<ProviderWriteResult> {
    const api = this.#makeApi(input.accessToken);
    try {
      const patched = await api.patch({
        eventId: input.providerEventId,
        body: toGraphPatchBody(input),
        ifMatch: input.expectedVersion,
      });
      return toResult(patched);
    } catch (error) {
      throw classifyWriteError(error);
    }
  }

  async deleteEvent(input: ProviderDeleteInput): Promise<void> {
    const api = this.#makeApi(input.accessToken);
    try {
      await api.delete({
        eventId: input.providerEventId,
        ifMatch: input.expectedVersion,
      });
    } catch (error) {
      if (isNotFound(error)) return;
      throw classifyWriteError(error);
    }
  }

  async fetchEvent(
    input: ProviderFetchInput,
  ): Promise<ProviderEventRead | null> {
    const api = this.#makeApi(input.accessToken);
    try {
      const event = await api.get({ eventId: input.providerEventId });
      return normalizeMicrosoftEvent(event);
    } catch (error) {
      if (isNotFound(error)) return null;
      throw classifyWriteError(error);
    }
  }

  async fetchInstanceAt(
    input: ProviderInstanceFetchInput,
  ): Promise<ProviderEventRead | null> {
    const api = this.#makeApi(input.accessToken);
    const { startDateTime, endDateTime } = instanceWindow(
      input.originalStartAt,
    );
    try {
      const instances = await api.listInstances({
        seriesEventId: input.seriesProviderEventId,
        startDateTime,
        endDateTime,
      });
      const match = instances.find(
        (item) =>
          item.originalStart !== undefined &&
          sameInstant(item.originalStart, input.originalStartAt),
      );
      if (!match) return null;
      return normalizeFetchedInstance(match, input);
    } catch (error) {
      if (isNotFound(error)) return null;
      throw classifyWriteError(error);
    }
  }

  async #resolveTeamsProvider(
    api: MicrosoftEventWriteApi,
    accessToken: string,
  ): Promise<string | null> {
    const now = Date.now();
    const cached = this.#meetingProviders.get(accessToken);
    if (cached && cached.expiresAt > now) return cached.teamsProvider;

    const calendar = await api.getCalendar();
    const teamsProvider = pickTeamsProvider(calendar);
    this.#meetingProviders.set(accessToken, {
      expiresAt: now + MEETING_PROVIDER_CACHE_TTL_MS,
      teamsProvider,
    });
    return teamsProvider;
  }
}

function toGraphCreateBody(input: ProviderCreateInput): GraphEventWriteBody {
  return {
    transactionId: input.providerEventId,
    ...toGraphWriteBody(
      input.content,
      input.schedule,
      input.recurrence,
      input.invitation,
      input.attendees,
    ),
  };
}

function toGraphPatchBody(input: ProviderPatchInput): GraphEventWriteBody {
  return toGraphWriteBody(
    input.content,
    input.schedule,
    input.recurrence,
    input.invitation,
    input.attendees,
  );
}

function toGraphWriteBody(
  content: SyncEventContent,
  schedule: EventSchedule,
  recurrence: ProviderWriteRecurrence,
  invitation: InvitationIntent,
  attendees?: readonly Attendee[],
): GraphEventWriteBody {
  return {
    subject: content.title,
    body: {
      contentType: "text",
      content: content.description ?? "",
    },
    location: { displayName: content.location ?? "" },
    ...scheduleFields(schedule),
    showAs: "busy",
    ...recurrenceField(recurrence, schedule),
    ...attendeesField(attendees, invitation),
  };
}

function scheduleFields(
  schedule: EventSchedule,
): Pick<GraphEventWriteBody, "start" | "end" | "isAllDay"> {
  if (schedule.kind === "allDay") {
    return {
      isAllDay: true,
      start: {
        dateTime: `${schedule.start}T00:00:00.000`,
        timeZone: "UTC",
      },
      end: {
        dateTime: `${schedule.end}T00:00:00.000`,
        timeZone: "UTC",
      },
    };
  }

  return {
    isAllDay: false,
    start: {
      dateTime: dayjs(schedule.start).utc().format(GRAPH_DATETIME),
      timeZone: "UTC",
    },
    end: {
      dateTime: dayjs(schedule.end).utc().format(GRAPH_DATETIME),
      timeZone: "UTC",
    },
  };
}

function recurrenceField(
  recurrence: ProviderWriteRecurrence,
  schedule: EventSchedule,
): Pick<GraphEventWriteBody, "recurrence"> | Record<string, never> {
  if (recurrence.kind === "instance") return {};
  if (recurrence.kind === "single") return { recurrence: null };
  try {
    return {
      recurrence: fromRRule(recurrence.rules, recurrenceWriteContext(schedule)),
    };
  } catch (error) {
    if (error instanceof UnsupportedRecurrenceError) {
      throw new ProviderWriteError("permanentProviderError", error.message, {
        cause: redactedCause(error),
      });
    }
    throw error;
  }
}

function recurrenceWriteContext(
  schedule: EventSchedule,
): MicrosoftRecurrenceWriteContext {
  if (schedule.kind === "allDay") {
    return { startDate: schedule.start };
  }
  return {
    startDate: dayjs(schedule.start)
      .tz(schedule.timeZone)
      .format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT),
    ianaTimeZone: schedule.timeZone,
  };
}

function attendeesField(
  attendees: readonly Attendee[] | undefined,
  invitation: InvitationIntent,
):
  | Pick<GraphEventWriteBody, "attendees" | "responseRequested">
  | Record<string, never> {
  if (!attendees) return {};
  if (attendees.length === 0) {
    return { attendees: attendees.map(toGraphAttendee) };
  }
  return {
    attendees: attendees.map(toGraphAttendee),
    responseRequested: invitation !== "none",
  };
}

function toGraphAttendee(attendee: Attendee): GraphAttendeeWrite {
  return {
    type: "required",
    emailAddress: {
      address: attendee.email,
      ...(attendee.displayName ? { name: attendee.displayName } : {}),
    },
    status: {
      response: COMPASS_TO_GRAPH_RESPONSE[attendee.responseStatus],
    },
  };
}

function toResult(event: GraphEvent): ProviderWriteResult {
  if (!event.id || !event["@odata.etag"]) {
    throw new ProviderWriteError(
      "permanentProviderError",
      "Microsoft returned an event without an id or etag",
    );
  }
  const conference = mapConference(event);
  return {
    providerEventId: event.id,
    providerVersion: event["@odata.etag"],
    ...(event.iCalUId ? { icalUid: event.iCalUId } : {}),
    ...(conference ? { conference } : {}),
  };
}

function pickTeamsProvider(calendar: GraphCalendarMeetingInfo): string | null {
  const defaultProvider = calendar.defaultOnlineMeetingProvider;
  if (defaultProvider && TEAMS_ONLINE_MEETING_PROVIDERS.has(defaultProvider)) {
    return defaultProvider;
  }
  return (
    calendar.allowedOnlineMeetingProviders?.find((provider) =>
      TEAMS_ONLINE_MEETING_PROVIDERS.has(provider),
    ) ?? null
  );
}

function instanceWindow(originalStartAt: string): {
  startDateTime: string;
  endDateTime: string;
} {
  const dayStart = dayjs.utc(originalStartAt).startOf("day");
  return {
    startDateTime: dayStart.format(GRAPH_DATETIME),
    endDateTime: dayStart.add(1, "day").format(GRAPH_DATETIME),
  };
}

function sameInstant(left: string, right: string): boolean {
  const a = Date.parse(left);
  const b = Date.parse(right);
  return Number.isFinite(a) && a === b;
}

// Graph /instances returns type "occurrence". The M-04 normalizer refuses
// those rows on the delta reader (they are expansions, not stored events).
// Rewrite to exception so the same mapper yields an addressable instance.
function normalizeFetchedInstance(
  item: GraphEvent,
  input: ProviderInstanceFetchInput,
): ProviderEventRead {
  return normalizeMicrosoftEvent({
    ...item,
    type: item.type === "occurrence" ? "exception" : item.type,
    seriesMasterId: item.seriesMasterId ?? input.seriesProviderEventId,
    originalStart: item.originalStart ?? input.originalStartAt,
  });
}

function classifyWriteError(error: unknown): ProviderWriteError {
  if (error instanceof ProviderWriteError) return error;
  if (error instanceof ProviderEventError) {
    return new ProviderWriteError("permanentProviderError", error.message, {
      cause: redactedCause(error),
    });
  }

  const status = microsoftStatus(error);
  const cause = microsoftFailureCause(error);

  if (status === 412) {
    return new ProviderWriteError(
      "versionConflict",
      "The event was modified since the expected version",
      { cause },
    );
  }
  if (status === 401) {
    return new ProviderWriteError(
      "authorizationRevoked",
      "Microsoft rejected the credential",
      { cause },
    );
  }
  if (status === 403) {
    return new ProviderWriteError(
      "readOnlyCalendar",
      "The calendar cannot be written",
      { cause },
    );
  }
  if (
    status === undefined ||
    status === 429 ||
    isMicrosoftTransient(error, status)
  ) {
    return new ProviderWriteError("transient", "The write failed transiently", {
      cause,
    });
  }
  return new ProviderWriteError(
    "permanentProviderError",
    "Microsoft rejected the write",
    { cause },
  );
}

function isNotFound(error: unknown): boolean {
  const status = microsoftStatus(error);
  return status === 404 || status === 410;
}

class FetchMicrosoftEventWriteApi implements MicrosoftEventWriteApi {
  #accessToken: string;

  constructor(accessToken: string) {
    this.#accessToken = accessToken;
  }

  create(params: {
    calendarId: string;
    body: GraphEventWriteBody;
  }): Promise<GraphEvent> {
    const calendarId = encodeURIComponent(params.calendarId);
    return this.#request(
      "POST",
      `${MICROSOFT_GRAPH_BASE_URL}/me/calendars/${calendarId}/events`,
      params.body,
    );
  }

  patch(params: {
    eventId: string;
    body: GraphEventWriteBody;
    ifMatch: string | null;
  }): Promise<GraphEvent> {
    const eventId = encodeURIComponent(params.eventId);
    return this.#request(
      "PATCH",
      `${MICROSOFT_GRAPH_BASE_URL}/me/events/${eventId}`,
      params.body,
      params.ifMatch,
    );
  }

  async delete(params: {
    eventId: string;
    ifMatch: string | null;
  }): Promise<void> {
    const eventId = encodeURIComponent(params.eventId);
    await this.#request(
      "DELETE",
      `${MICROSOFT_GRAPH_BASE_URL}/me/events/${eventId}`,
      undefined,
      params.ifMatch,
    );
  }

  get(params: { eventId: string }): Promise<GraphEvent> {
    const eventId = encodeURIComponent(params.eventId);
    const query = new URLSearchParams({ $select: MICROSOFT_EVENT_SELECT });
    return this.#request(
      "GET",
      `${MICROSOFT_GRAPH_BASE_URL}/me/events/${eventId}?${query}`,
    );
  }

  getCalendar(): Promise<GraphCalendarMeetingInfo> {
    const query = new URLSearchParams({ $select: CALENDAR_MEETING_SELECT });
    return this.#request<GraphCalendarMeetingInfo>(
      "GET",
      `${MICROSOFT_GRAPH_BASE_URL}/me/calendar?${query}`,
    );
  }

  async listInstances(params: {
    seriesEventId: string;
    startDateTime: string;
    endDateTime: string;
  }): Promise<readonly GraphEvent[]> {
    const eventId = encodeURIComponent(params.seriesEventId);
    const query = new URLSearchParams({
      startDateTime: params.startDateTime,
      endDateTime: params.endDateTime,
      $select: MICROSOFT_EVENT_SELECT,
    });
    const data = await this.#request<{ value?: readonly GraphEvent[] }>(
      "GET",
      `${MICROSOFT_GRAPH_BASE_URL}/me/events/${eventId}/instances?${query}`,
    );
    return data.value ?? [];
  }

  async #request<T = GraphEvent>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    url: string,
    body?: GraphEventWriteBody,
    ifMatch: string | null = null,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.#accessToken}`,
      Prefer: 'outlook.timezone="UTC"',
    };
    if (ifMatch) headers["If-Match"] = ifMatch;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const response = await fetch(url, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(MICROSOFT_REQUEST_TIMEOUT_MS),
    });

    if (method === "DELETE") {
      if (response.ok) return {} as T;
      const deleteError = await parseErrorBody(response);
      throw Object.assign(
        new Error(deleteError.message ?? "microsoft_event_write_failed"),
        { response: { status: response.status, data: deleteError.data } },
      );
    }

    const data = (await response.json()) as T & {
      error?: { code?: string; message?: string };
    };

    if (!response.ok) {
      throw Object.assign(
        new Error(data.error?.message ?? "microsoft_event_write_failed"),
        { response: { status: response.status, data } },
      );
    }

    return data;
  }
}

async function parseErrorBody(response: Response): Promise<{
  message?: string;
  data?: unknown;
}> {
  try {
    const data = (await response.json()) as {
      error?: { message?: string };
    };
    return { message: data.error?.message, data };
  } catch {
    return {};
  }
}
