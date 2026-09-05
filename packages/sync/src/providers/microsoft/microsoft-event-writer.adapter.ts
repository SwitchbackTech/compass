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
}

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
}

export type MicrosoftEventWriteApiFactory = (
  accessToken: string,
) => MicrosoftEventWriteApi;

const defaultApiFactory: MicrosoftEventWriteApiFactory = (accessToken) =>
  new FetchMicrosoftEventWriteApi(accessToken);

// Microsoft Graph implementation of the event mutation port. Create is
// idempotent via transactionId, patch and delete can be conditioned on etag,
// and provider errors are classified into neutral, caller-actionable reasons.
//
// Named wart: Graph sends attendee mail on create and on attendee changes even
// when responseRequested is false (invitation "none"). Compass honors "none" by
// setting responseRequested false, but Outlook may still notify attendees.
export class MicrosoftEventWriter implements ProviderEventWriter {
  #makeApi: MicrosoftEventWriteApiFactory;

  constructor(makeApi: MicrosoftEventWriteApiFactory = defaultApiFactory) {
    this.#makeApi = makeApi;
  }

  async createEvent(input: ProviderCreateInput): Promise<ProviderWriteResult> {
    if (input.createConference) {
      // Teams conference creation lands in M-06b; booking copy handles null URL.
    }

    const api = this.#makeApi(input.accessToken);
    const body = toGraphCreateBody(input);

    try {
      const created = await api.create({
        calendarId: input.calendarId,
        body,
      });
      return toResult(created);
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
    _input: ProviderInstanceFetchInput,
  ): Promise<ProviderEventRead | null> {
    throw new ProviderWriteError(
      "unsupportedCapability",
      "Microsoft instance resolution lands in M-06b",
    );
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
  return {
    providerEventId: event.id,
    providerVersion: event["@odata.etag"],
    ...(event.iCalUId ? { icalUid: event.iCalUId } : {}),
  };
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

  async #request(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    url: string,
    body?: GraphEventWriteBody,
    ifMatch: string | null = null,
  ): Promise<GraphEvent> {
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
      if (response.ok) return {} as GraphEvent;
      const deleteError = await parseErrorBody(response);
      throw Object.assign(
        new Error(deleteError.message ?? "microsoft_event_write_failed"),
        { response: { status: response.status, data: deleteError.data } },
      );
    }

    const data = (await response.json()) as GraphEvent & {
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
