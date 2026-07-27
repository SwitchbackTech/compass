import { type calendar_v3 } from "@googleapis/calendar";
import { EventScheduleSchema } from "@core/types/event.contracts";
import { withColor } from "@core/types/event-color.contracts";
import { type gSchema$Event } from "@core/types/gcal";
import {
  type Attendee,
  type Conference,
  ConferenceSchema,
  type Organizer,
  SyncEventContentSchema,
} from "@core/types/sync/event.contracts";
import dayjs from "@core/util/date/dayjs";
import { googleColorIdToSlot } from "@sync/providers/google/google-color.map";
import {
  ProviderEventError,
  type ProviderEventRead,
  type ProviderEventRecurrence,
} from "@sync/providers/provider-event.port";

const RFC3339_OFFSET = dayjs.DateFormat.RFC3339_OFFSET;

// Normalize one Google event read into a provider-neutral read. A cancelled
// event becomes a cancellation (providers strip its content and schedule); an
// active event becomes a full read. Throws ProviderEventError only when the
// read is structurally unusable, never for merely sparse events.
export function normalizeGoogleEvent(item: gSchema$Event): ProviderEventRead {
  const providerEventId = requireId(item);
  const providerVersion = requireVersion(item);

  if (item.status === "cancelled") {
    return {
      kind: "cancellation",
      providerEventId,
      providerVersion,
      series: cancellationSeries(item),
    };
  }

  return {
    kind: "event",
    providerEventId,
    providerVersion,
    providerUpdatedAt: item.updated ?? null,
    content: mapContent(item),
    schedule: mapSchedule(item),
    // Absent transparency means "opaque" (busy) in Google's model.
    busy: item.transparency !== "transparent",
    recurrence: mapRecurrence(item),
  };
}

function requireId(item: gSchema$Event): string {
  if (!item.id) {
    throw new ProviderEventError("missingIdentity", "Event carried no id");
  }
  return item.id;
}

function requireVersion(item: gSchema$Event): string {
  if (!item.etag) {
    throw new ProviderEventError("missingIdentity", "Event carried no etag");
  }
  return item.etag;
}

function cancellationSeries(
  item: gSchema$Event,
): { seriesProviderId: string; recurrenceId: string } | null {
  if (!item.recurringEventId || !item.originalStartTime) return null;
  return {
    seriesProviderId: item.recurringEventId,
    recurrenceId: toOffsetIso(item.originalStartTime),
  };
}

function mapContent(item: gSchema$Event) {
  // safeParse, not parse: a provider can report a field the neutral contract
  // caps but the provider does not (e.g. an attendee displayName longer than
  // the contract's max). That makes one event unusable, so it must surface as a
  // ProviderEventError the reader can skip — never a raw ZodError that would
  // escape the per-event skip boundary and fail a whole import page.
  const color = googleColorIdToSlot(item.colorId);
  const parsed = SyncEventContentSchema.safeParse({
    // Google omits summary/description for untitled/empty events; the neutral
    // contract models those as empty strings, not absence.
    title: item.summary ?? "",
    description: item.description ?? "",
    location: item.location ?? null,
    organizer: mapOrganizer(item.organizer),
    attendees: mapAttendees(item.attendees),
    conference: mapConference(item),
    ...withColor(color),
  });
  if (!parsed.success) {
    throw new ProviderEventError(
      "unmappableContent",
      "Event content failed the neutral contract",
      { cause: parsed.error },
    );
  }
  return parsed.data;
}

function mapOrganizer(
  organizer: calendar_v3.Schema$Event["organizer"],
): Organizer | null {
  if (!organizer?.email) return null;
  return {
    email: organizer.email,
    // Trim first: a whitespace-only name is absence, and would fail the
    // contract's min-length after its own trim.
    displayName: organizer.displayName?.trim() || null,
  };
}

const KNOWN_RESPONSES = new Set(["accepted", "declined", "tentative"]);

function mapAttendees(
  attendees: calendar_v3.Schema$Event["attendees"],
): Attendee[] {
  return (attendees ?? [])
    .filter((attendee) => Boolean(attendee.email))
    .map((attendee) => ({
      email: attendee.email as string,
      displayName: attendee.displayName?.trim() || null,
      // Anything Google does not report as a decision is still pending.
      responseStatus: KNOWN_RESPONSES.has(attendee.responseStatus ?? "")
        ? (attendee.responseStatus as Attendee["responseStatus"])
        : "needsAction",
    }));
}

function mapConference(item: gSchema$Event): Conference | null {
  const url =
    item.hangoutLink ??
    item.conferenceData?.entryPoints?.find(
      (entry: calendar_v3.Schema$EntryPoint) =>
        entry.entryPointType === "video",
    )?.uri;
  if (!url) return null;

  // Best-effort: a malformed conference URL drops the conference rather than
  // failing the whole event read.
  const parsed = ConferenceSchema.safeParse({
    url,
    label: item.conferenceData?.conferenceSolution?.name || null,
  });
  return parsed.success ? parsed.data : null;
}

function mapSchedule(item: gSchema$Event) {
  const { start, end } = item;
  if (!start || !end) {
    throw new ProviderEventError(
      "unmappableSchedule",
      "Event has no start or end",
    );
  }

  if (start.date && end.date) {
    // Google's all-day end date is already exclusive, matching the contract.
    return parseSchedule({
      kind: "allDay",
      start: start.date,
      end: end.date,
    });
  }

  if (start.dateTime && end.dateTime) {
    const timeZone = start.timeZone ?? end.timeZone;
    if (!timeZone) {
      throw new ProviderEventError(
        "unmappableSchedule",
        "Timed event carried no time zone",
      );
    }
    // Re-anchor to the IANA zone so the emitted offset is correct for that
    // date's DST rules rather than trusting the stored offset.
    return parseSchedule({
      kind: "timed",
      start: toOffsetIso(start),
      end: toOffsetIso(end),
      timeZone,
    });
  }

  throw new ProviderEventError(
    "unmappableSchedule",
    "Event start/end mixes date and dateTime",
  );
}

// safeParse the neutral schedule so a value the contract rejects surfaces as a
// skippable ProviderEventError, not a raw ZodError that would escape the
// reader's per-event skip boundary and fail a whole import page.
function parseSchedule(candidate: unknown) {
  const parsed = EventScheduleSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new ProviderEventError(
      "unmappableSchedule",
      "Event start/end could not be resolved to a schedule",
      { cause: parsed.error },
    );
  }
  return parsed.data;
}

function mapRecurrence(item: gSchema$Event): ProviderEventRecurrence {
  if (Array.isArray(item.recurrence) && item.recurrence.length > 0) {
    return { kind: "seriesMaster", rules: item.recurrence };
  }
  if (item.recurringEventId && item.originalStartTime) {
    return {
      kind: "instance",
      seriesProviderId: item.recurringEventId,
      recurrenceId: toOffsetIso(item.originalStartTime),
    };
  }
  return { kind: "single" };
}

// A Google event date-time as a deterministic RFC3339 offset string, never
// dependent on the host's zone. With a zone, re-anchor to it so the offset is
// correct for that date's DST rules. Without one, canonicalize to UTC rather
// than guessing the host's zone, so the value is a stable identity across
// machines. An all-day date becomes UTC midnight. The absolute instant is
// preserved in every case.
function toOffsetIso(eventDateTime: calendar_v3.Schema$EventDateTime): string {
  const { date, dateTime, timeZone } = eventDateTime;
  if (dateTime) {
    const anchored = timeZone
      ? dayjs(dateTime).tz(timeZone)
      : dayjs(dateTime).utc();
    return anchored.format(RFC3339_OFFSET);
  }
  if (date) {
    return dayjs.utc(date).format(RFC3339_OFFSET);
  }
  throw new ProviderEventError(
    "unmappableSchedule",
    "Event date-time had neither a date nor a dateTime",
  );
}
