import { calendar, type calendar_v3 } from "@googleapis/calendar";
import { OAuth2Client } from "google-auth-library";
import { type EventSchedule } from "@core/types/event.contracts";
import {
  type gCalendar,
  type gSchema$Event,
  type gSchema$Events,
} from "@core/types/gcal";
import { type SyncEventContent } from "@core/types/sync/event.contracts";
import dayjs from "@core/util/date/dayjs";
import { googleColorIdFields } from "@sync/providers/google/google-color.map";
import { normalizeGoogleEvent } from "@sync/providers/google/google-event.normalizer";
import { GOOGLE_REQUEST_TIMEOUT_MS } from "@sync/providers/google/google-http.constants";
import { type ProviderEventRead } from "@sync/providers/provider-event.port";
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

// The Google event calls the writer makes. Depending on this narrow interface
// (not the concrete googleapis client) lets tests script results and errors
// without a network round-trip or module mocking. `get` throws on 404 like the
// real client; the adapter turns that into a null/idempotent result.
export interface GoogleEventsApi {
  insert(params: {
    calendarId: string;
    requestBody: gSchema$Event;
    sendUpdates: string;
  }): Promise<gSchema$Event>;
  patch(params: {
    calendarId: string;
    eventId: string;
    requestBody: gSchema$Event;
    sendUpdates: string;
    ifMatch: string | null;
  }): Promise<gSchema$Event>;
  delete(params: {
    calendarId: string;
    eventId: string;
    sendUpdates: string;
    ifMatch: string | null;
  }): Promise<void>;
  get(params: { calendarId: string; eventId: string }): Promise<gSchema$Event>;
  // originalStart, when given, filters to the single instance whose
  // ORIGINAL scheduled start matches it — resolving one occurrence's own
  // provider identity without guessing a time window (a rescheduled
  // instance's CURRENT start can differ arbitrarily from its identity).
  instances(params: {
    calendarId: string;
    eventId: string;
    originalStart: string;
  }): Promise<gSchema$Events>;
}

export type GoogleEventsApiFactory = (accessToken: string) => GoogleEventsApi;

const defaultApiFactory: GoogleEventsApiFactory = (accessToken) => {
  const auth = new OAuth2Client();
  auth.setCredentials({ access_token: accessToken });
  const gcal: gCalendar = calendar({
    version: "v3",
    auth,
    timeout: GOOGLE_REQUEST_TIMEOUT_MS,
  });
  // An If-Match precondition is passed as a request header; googleapis takes
  // per-call gaxios options as the second argument.
  const ifMatchOptions = (ifMatch: string | null) =>
    ifMatch ? { headers: { "If-Match": ifMatch } } : undefined;
  return {
    async insert({ calendarId, requestBody, sendUpdates }) {
      const { data } = await gcal.events.insert({
        calendarId,
        requestBody,
        sendUpdates,
      });
      return data;
    },
    async patch({ calendarId, eventId, requestBody, sendUpdates, ifMatch }) {
      const { data } = await gcal.events.patch(
        { calendarId, eventId, requestBody, sendUpdates },
        ifMatchOptions(ifMatch),
      );
      return data;
    },
    async delete({ calendarId, eventId, sendUpdates, ifMatch }) {
      await gcal.events.delete(
        { calendarId, eventId, sendUpdates },
        ifMatchOptions(ifMatch),
      );
    },
    async get({ calendarId, eventId }) {
      const { data } = await gcal.events.get({ calendarId, eventId });
      return data;
    },
    async instances({ calendarId, eventId, originalStart }) {
      const { data } = await gcal.events.instances({
        calendarId,
        eventId,
        originalStart,
      });
      return data;
    },
  };
};

// Google implementation of the event mutation port. Create is idempotent at a
// caller-chosen id, patch and delete can be conditioned on a version, and
// provider errors are classified into neutral, caller-actionable reasons.
export class GoogleEventWriter implements ProviderEventWriter {
  readonly provider = "google" as const;

  #makeApi: GoogleEventsApiFactory;

  constructor(makeApi: GoogleEventsApiFactory = defaultApiFactory) {
    this.#makeApi = makeApi;
  }

  async createEvent(input: ProviderCreateInput): Promise<ProviderWriteResult> {
    const api = this.#makeApi(input.accessToken);
    const requestBody: gSchema$Event = {
      id: input.providerEventId,
      ...toGoogleBody(input.content, input.schedule, input.recurrence),
    };

    try {
      const created = await api.insert({
        calendarId: input.calendarId,
        requestBody,
        sendUpdates: toSendUpdates(input.invitation),
      });
      return toResult(created);
    } catch (error) {
      // A duplicate id means a prior attempt already created it: read it back
      // and report success so a retry is a no-op, not a failure. The read-back
      // has its own try so a failed lookup is classified (and redacted) too,
      // never leaked as a raw provider error.
      if (googleStatus(error) === 409) {
        try {
          const existing = await api.get({
            calendarId: input.calendarId,
            eventId: input.providerEventId,
          });
          return toResult(existing);
        } catch (getError) {
          throw classifyWriteError(getError);
        }
      }
      throw classifyWriteError(error);
    }
  }

  async patchEvent(input: ProviderPatchInput): Promise<ProviderWriteResult> {
    const api = this.#makeApi(input.accessToken);
    try {
      const patched = await api.patch({
        calendarId: input.calendarId,
        eventId: input.providerEventId,
        requestBody: toGoogleBody(
          input.content,
          input.schedule,
          input.recurrence,
        ),
        sendUpdates: toSendUpdates(input.invitation),
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
        calendarId: input.calendarId,
        eventId: input.providerEventId,
        sendUpdates: toSendUpdates(input.invitation),
        ifMatch: input.expectedVersion,
      });
    } catch (error) {
      // Already gone: a delete of an absent event is a success, so retries and
      // races converge instead of surfacing a spurious failure.
      if (isNotFound(error)) return;
      throw classifyWriteError(error);
    }
  }

  async fetchEvent(
    input: ProviderFetchInput,
  ): Promise<ProviderEventRead | null> {
    const api = this.#makeApi(input.accessToken);
    try {
      const event = await api.get({
        calendarId: input.calendarId,
        eventId: input.providerEventId,
      });
      return normalizeGoogleEvent(event);
    } catch (error) {
      if (isNotFound(error)) return null;
      throw classifyWriteError(error);
    }
  }

  async fetchInstanceAt(
    input: ProviderInstanceFetchInput,
  ): Promise<ProviderEventRead | null> {
    const api = this.#makeApi(input.accessToken);
    try {
      const page = await api.instances({
        calendarId: input.calendarId,
        eventId: input.seriesProviderEventId,
        originalStart: toOriginalStartFilter(
          input.originalStartAt,
          input.scheduleKind,
        ),
      });
      const item = page.items?.[0];
      // No instance at that instant: never materialized (a rule that never
      // actually produced an occurrence there), or the series itself is gone
      // — either way, nothing for the caller to patch/delete.
      if (!item) return null;
      return normalizeGoogleEvent(item);
    } catch (error) {
      // A 404 on the SERIES itself (not just the instance) surfaces here too
      // — both mean "nothing to resolve", so both return null rather than
      // distinguishing (the caller treats either the same way).
      if (isNotFound(error)) return null;
      throw classifyWriteError(error);
    }
  }
}

function toResult(event: gSchema$Event): ProviderWriteResult {
  if (!event.id || !event.etag) {
    throw new ProviderWriteError(
      "permanentProviderError",
      "Google returned an event without an id or etag",
    );
  }
  return {
    providerEventId: event.id,
    providerVersion: event.etag,
    ...(event.iCalUID ? { icalUid: event.iCalUID } : {}),
  };
}

// Map neutral content/schedule/recurrence to a Google event body. Because
// events.patch merges by key, keys that must be cleared are set to null rather
// than omitted — an omitted key is left unchanged on Google, and leaving the
// other schedule kind's keys behind makes Google reject a start holding both a
// date and a dateTime.
//
// organizer, attendees, and conference are deliberately NOT written. Compass is
// not authoritative for a provider event's guest list (organizer is fixed by
// the provider at creation, and attendee/conference management is a separate
// concern), so those are read-reflected only. Patch's merge-by-key semantics
// leave the provider's own values untouched, which is the intended behavior.
// sendUpdates still notifies existing attendees of the title/time changes we do
// write.
function toGoogleBody(
  content: SyncEventContent,
  schedule: EventSchedule,
  recurrence: ProviderWriteRecurrence,
): gSchema$Event {
  return {
    summary: content.title,
    description: content.description,
    location: content.location,
    ...googleColorIdFields(content.color),
    ...scheduleFields(schedule),
    ...recurrenceField(recurrence),
  };
}

// "series" writes rules; "single" clears them with an explicit null (patch
// merges by key, so an omitted key would leave a prior series' rules on a
// converted event); "instance" omits the key — Google rejects a `recurrence`
// key at all on an event resolved off a series via fetchInstanceAt.
function recurrenceField(
  recurrence: ProviderWriteRecurrence,
): Partial<Pick<calendar_v3.Schema$Event, "recurrence">> {
  if (recurrence.kind === "series")
    return { recurrence: [...recurrence.rules] };
  if (recurrence.kind === "single") return { recurrence: null };
  return {};
}

function scheduleFields(
  schedule: EventSchedule,
): Pick<calendar_v3.Schema$Event, "start" | "end"> {
  if (schedule.kind === "timed") {
    return {
      start: {
        date: null,
        dateTime: schedule.start,
        timeZone: schedule.timeZone,
      },
      end: { date: null, dateTime: schedule.end, timeZone: schedule.timeZone },
    };
  }
  return {
    start: { date: schedule.start, dateTime: null, timeZone: null },
    end: { date: schedule.end, dateTime: null, timeZone: null },
  };
}

// Google reports an all-day instance's original start as a bare date
// (`originalStartTime: { date: "2026-08-08" }`), never a dateTime — so the
// `originalStart` filter on events.instances must be sent in that same date
// form, or it matches nothing and the occurrence resolves to null. Compass's
// recurrenceId is always a full ISO datetime (`2026-08-08T00:00:00.000Z` for
// an all-day instant), so an all-day lookup truncates to its date component;
// a timed lookup is sent through unchanged.
function toOriginalStartFilter(
  originalStartAt: string,
  scheduleKind: "timed" | "allDay",
): string {
  if (scheduleKind === "timed") return originalStartAt;
  return dayjs
    .utc(originalStartAt)
    .format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);
}

// Google's sendUpdates values are exactly the neutral invitation intents.
function toSendUpdates(invitation: InvitationIntent): string {
  return invitation;
}

// Google 403 reasons that mean "slow down", not "forbidden" — retryable.
const RETRYABLE_403_REASONS = new Set([
  "rateLimitExceeded",
  "userRateLimitExceeded",
  "quotaExceeded",
  "dailyLimitExceeded",
]);

function classifyWriteError(error: unknown): ProviderWriteError {
  // An already-classified error (e.g. a missing-identity result) must not be
  // re-wrapped as transient just because it carries no HTTP status.
  if (error instanceof ProviderWriteError) return error;

  const status = googleStatus(error);
  const cause = redactedCause(error);

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
      "Google rejected the credential",
      { cause },
    );
  }
  if (status === 403) {
    // A quota 403 is retryable; any other 403 means the calendar is not
    // writable with this authorization.
    if (hasRetryable403Reason(error)) {
      return new ProviderWriteError(
        "transient",
        "Google rate limited the write",
        { cause },
      );
    }
    return new ProviderWriteError(
      "readOnlyCalendar",
      "The calendar cannot be written",
      { cause },
    );
  }
  // No status (network failure) or 429/5xx are transient and safe to retry.
  if (status === undefined || status === 429 || status >= 500) {
    return new ProviderWriteError("transient", "The write failed transiently", {
      cause,
    });
  }
  return new ProviderWriteError(
    "permanentProviderError",
    "Google rejected the write",
    { cause },
  );
}

function isNotFound(error: unknown): boolean {
  const status = googleStatus(error);
  return status === 404 || status === 410;
}

function googleStatus(error: unknown): number | undefined {
  return (
    (error as { response?: { status?: number } })?.response?.status ??
    (error as { code?: number })?.code
  );
}

function hasRetryable403Reason(error: unknown): boolean {
  const errors = (
    error as {
      response?: { data?: { error?: { errors?: Array<{ reason?: string }> } } };
    }
  )?.response?.data?.error?.errors;
  return Boolean(
    errors?.some((e) => e.reason && RETRYABLE_403_REASONS.has(e.reason)),
  );
}

// Google event ids must be base32hex (0-9, a-v), 5-1024 chars. A Compass
// ObjectId hex string is a strict subset, so it is a valid, deterministic id
// as-is — using it makes a create idempotent without a separate mapping.
const BASE32HEX_ID = /^[0-9a-v]{5,1024}$/;

export function deriveGoogleEventId(compassEventId: string): string {
  const id = compassEventId.toLowerCase();
  if (!BASE32HEX_ID.test(id)) {
    throw new Error(
      "Compass event id is not a valid Google event id (base32hex, 5-1024 chars)",
    );
  }
  return id;
}
