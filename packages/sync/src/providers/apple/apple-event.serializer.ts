import ICAL from "ical.js";
import { type EventSchedule } from "@core/types/event.contracts";
import {
  type Attendee,
  type Organizer,
} from "@core/types/event-attendance.contracts";
import { type SyncEventContent } from "@core/types/sync/event.contracts";
import dayjs from "@core/util/date/dayjs";
import { type ProviderWriteRecurrence } from "@sync/providers/provider-event-writer.port";

const COMPASS_PRODID = "-//Compass//NONSGML Compass Calendar//EN";
const DATE_ONLY = dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT;

export interface AppleEventSerializeInput {
  readonly providerEventId: string;
  readonly content: SyncEventContent;
  readonly schedule: EventSchedule;
  readonly recurrence: ProviderWriteRecurrence;
  readonly busy: boolean;
  readonly attendees?: readonly Attendee[];
  readonly dtstamp?: string;
  readonly sequence?: number;
}

export type AppleEventPatchField =
  | "title"
  | "description"
  | "location"
  | "conference"
  | "organizer"
  | "schedule"
  | "recurrence"
  | "busy"
  | "attendees";

export interface AppleEventSerializePatchInput
  extends AppleEventSerializeInput {
  readonly existingIcs: string;
  readonly patchFields: readonly AppleEventPatchField[];
  readonly scheduleChanged: boolean;
  readonly attendeesChanged: boolean;
}

export interface AppleEventSerializeInstanceInput
  extends AppleEventSerializeInput {
  readonly existingIcs: string;
  readonly instanceRecurrenceId: string;
  readonly scheduleChanged: boolean;
  readonly attendeesChanged: boolean;
}

// Serialize a new CalDAV ICS resource for PUT (create).
export function serializeAppleEventCreate(
  input: AppleEventSerializeInput,
): string {
  const calendar = newCalendarShell();
  const vevent = new ICAL.Component("vevent");
  calendar.addSubcomponent(vevent);
  applyIdentity(
    vevent,
    input.providerEventId,
    input.dtstamp,
    input.sequence ?? 0,
  );
  applyFullWrite(vevent, input);
  return calendar.toString();
}

// Merge changed fields onto an existing resource, preserving unknown properties.
export function serializeAppleEventPatch(
  input: AppleEventSerializePatchInput,
): string {
  const calendar = parseCalendar(input.existingIcs);
  const vevent = findMasterVevent(calendar);
  applySequence(
    vevent,
    readSequence(vevent),
    input.scheduleChanged,
    input.attendeesChanged,
  );
  applyPatchFields(vevent, input);
  return calendar.toString();
}

// Add or replace one RECURRENCE-ID sibling inside the master's resource.
export function serializeAppleEventInstance(
  input: AppleEventSerializeInstanceInput,
): string {
  const calendar = parseCalendar(input.existingIcs);
  const master = findMasterVevent(calendar);
  const masterUid = master.getFirstPropertyValue("uid");
  if (typeof masterUid !== "string" || masterUid.trim().length === 0) {
    throw new Error("Master VEVENT carried no UID");
  }
  const recurrenceTime = recurrenceIdToICalTime(
    input.instanceRecurrenceId,
    input.schedule.kind,
  );
  const exception =
    findExceptionVevent(calendar, recurrenceTime) ??
    new ICAL.Component("vevent");
  if (!exception.parent) {
    calendar.addSubcomponent(exception);
  }
  applyIdentity(
    exception,
    masterUid,
    input.dtstamp,
    applySequence(
      exception,
      readSequence(exception) ?? readSequence(master),
      input.scheduleChanged,
      input.attendeesChanged,
    ),
  );
  setRecurrenceId(exception, recurrenceTime);
  applyFullWrite(exception, input);
  return calendar.toString();
}

function newCalendarShell(): ICAL.Component {
  const calendar = new ICAL.Component("vcalendar");
  calendar.updatePropertyWithValue("version", "2.0");
  calendar.updatePropertyWithValue("prodid", COMPASS_PRODID);
  return calendar;
}

function parseCalendar(ics: string): ICAL.Component {
  return new ICAL.Component(ICAL.parse(ics));
}

function findMasterVevent(calendar: ICAL.Component): ICAL.Component {
  const masters = calendar
    .getAllSubcomponents("vevent")
    .filter((vevent) => !vevent.hasProperty("recurrence-id"));
  const master = masters[0];
  if (!master) {
    throw new Error("ICS resource had no master VEVENT");
  }
  return master;
}

function findExceptionVevent(
  calendar: ICAL.Component,
  recurrenceTime: ICAL.Time,
): ICAL.Component | null {
  for (const vevent of calendar.getAllSubcomponents("vevent")) {
    const property = vevent.getFirstProperty("recurrence-id");
    if (!property) continue;
    const value = property.getFirstValue() as ICAL.Time;
    if (recurrenceTimesEqual(value, recurrenceTime)) {
      return vevent;
    }
  }
  return null;
}

function applyIdentity(
  vevent: ICAL.Component,
  uid: string,
  dtstamp: string | undefined,
  sequence: number,
): void {
  vevent.updatePropertyWithValue("uid", uid);
  vevent.updatePropertyWithValue(
    "dtstamp",
    ICAL.Time.fromJSDate(new Date(dtstamp ?? Date.now()), true),
  );
  vevent.updatePropertyWithValue("sequence", sequence);
}

function applyFullWrite(
  vevent: ICAL.Component,
  input: AppleEventSerializeInput,
): void {
  applyContentField(vevent, "title", input.content.title, (value) => {
    vevent.updatePropertyWithValue("summary", value);
  });
  applyContentField(
    vevent,
    "description",
    input.content.description,
    (value) => {
      vevent.updatePropertyWithValue("description", value);
    },
  );
  applyContentField(
    vevent,
    "location",
    input.content.location ?? "",
    (value) => {
      if (value.length === 0) {
        vevent.removeAllProperties("location");
        return;
      }
      vevent.updatePropertyWithValue("location", value);
    },
  );
  applyOrganizer(vevent, input.content.organizer);
  applyConference(vevent, input.content.conference);
  applyAttendees(vevent, input.attendees ?? input.content.attendees);
  applySchedule(vevent, input.schedule);
  applyRecurrence(vevent, input.recurrence);
  applyBusy(vevent, input.busy);
}

function applyPatchFields(
  vevent: ICAL.Component,
  input: AppleEventSerializePatchInput,
): void {
  const fields = new Set(input.patchFields);
  if (fields.has("title")) {
    vevent.updatePropertyWithValue("summary", input.content.title);
  }
  if (fields.has("description")) {
    vevent.updatePropertyWithValue("description", input.content.description);
  }
  if (fields.has("location")) {
    if ((input.content.location ?? "").length === 0) {
      vevent.removeAllProperties("location");
    } else {
      vevent.updatePropertyWithValue("location", input.content.location);
    }
  }
  if (fields.has("organizer")) {
    applyOrganizer(vevent, input.content.organizer);
  }
  if (fields.has("conference")) {
    applyConference(vevent, input.content.conference);
  }
  if (fields.has("attendees")) {
    applyAttendees(vevent, input.attendees ?? input.content.attendees);
  }
  if (fields.has("schedule")) {
    applySchedule(vevent, input.schedule);
  }
  if (fields.has("recurrence")) {
    applyRecurrence(vevent, input.recurrence);
  }
  if (fields.has("busy")) {
    applyBusy(vevent, input.busy);
  }
}

function applyContentField<T>(
  _vevent: ICAL.Component,
  _field: string,
  value: T,
  apply: (value: T) => void,
): void {
  apply(value);
}

function applySchedule(vevent: ICAL.Component, schedule: EventSchedule): void {
  vevent.removeAllProperties("dtstart");
  vevent.removeAllProperties("dtend");
  vevent.removeAllProperties("duration");

  if (schedule.kind === "allDay") {
    vevent.addPropertyWithValue("dtstart", dateOnlyToICalTime(schedule.start));
    vevent.addPropertyWithValue("dtend", dateOnlyToICalTime(schedule.end));
    return;
  }

  vevent.addPropertyWithValue("dtstart", dateTimeToUtcICalTime(schedule.start));
  vevent.addPropertyWithValue("dtend", dateTimeToUtcICalTime(schedule.end));
}

function applyRecurrence(
  vevent: ICAL.Component,
  recurrence: ProviderWriteRecurrence,
): void {
  vevent.removeAllProperties("rrule");
  vevent.removeAllProperties("exdate");
  vevent.removeAllProperties("rdate");
  if (recurrence.kind !== "series") return;
  for (const rule of recurrence.rules) {
    vevent.addProperty(ICAL.Property.fromString(rule));
  }
}

function applyBusy(vevent: ICAL.Component, busy: boolean): void {
  vevent.updatePropertyWithValue("transp", busy ? "OPAQUE" : "TRANSPARENT");
}

function applyOrganizer(
  vevent: ICAL.Component,
  organizer: Organizer | null,
): void {
  vevent.removeAllProperties("organizer");
  if (!organizer) return;
  const property = new ICAL.Property("organizer");
  property.setValue(`mailto:${organizer.email}`);
  if (organizer.displayName) {
    property.setParameter("cn", organizer.displayName);
  }
  vevent.addProperty(property);
}

function applyAttendees(
  vevent: ICAL.Component,
  attendees: readonly Attendee[],
): void {
  vevent.removeAllProperties("attendee");
  for (const attendee of attendees) {
    vevent.addProperty(attendeeToProperty(attendee));
  }
}

function attendeeToProperty(attendee: Attendee): ICAL.Property {
  const property = new ICAL.Property("attendee");
  property.setValue(`mailto:${attendee.email}`);
  if (attendee.displayName) {
    property.setParameter("cn", attendee.displayName);
  }
  property.setParameter(
    "partstat",
    partstatFromResponse(attendee.responseStatus),
  );
  property.setParameter("rsvp", "TRUE");
  return property;
}

function applyConference(
  vevent: ICAL.Component,
  conference: SyncEventContent["conference"],
): void {
  vevent.removeAllProperties("url");
  if (!conference?.url) return;
  vevent.updatePropertyWithValue("url", conference.url);
}

function setRecurrenceId(
  vevent: ICAL.Component,
  recurrenceTime: ICAL.Time,
): void {
  vevent.removeAllProperties("recurrence-id");
  vevent.addPropertyWithValue("recurrence-id", recurrenceTime);
}

function readSequence(vevent: ICAL.Component): number {
  const value = vevent.getFirstPropertyValue("sequence");
  return typeof value === "number" ? value : 0;
}

function applySequence(
  vevent: ICAL.Component,
  current: number,
  scheduleChanged: boolean,
  attendeesChanged: boolean,
): number {
  const next = scheduleChanged || attendeesChanged ? current + 1 : current;
  vevent.updatePropertyWithValue("sequence", next);
  return next;
}

function dateOnlyToICalTime(dateOnly: string): ICAL.Time {
  const time = ICAL.Time.fromDateString(
    dayjs(dateOnly, DATE_ONLY, true).format("YYYY-MM-DD"),
  );
  time.isDate = true;
  return time;
}

function dateTimeToUtcICalTime(dateTime: string): ICAL.Time {
  return ICAL.Time.fromJSDate(new Date(dateTime), true);
}

function recurrenceIdToICalTime(
  recurrenceId: string,
  scheduleKind: EventSchedule["kind"],
): ICAL.Time {
  if (scheduleKind === "allDay") {
    const dateOnly = dayjs.utc(recurrenceId).format(DATE_ONLY);
    return dateOnlyToICalTime(dateOnly);
  }
  return dateTimeToUtcICalTime(recurrenceId);
}

function recurrenceTimesEqual(a: ICAL.Time, b: ICAL.Time): boolean {
  if (a.isDate !== b.isDate) return false;
  if (a.isDate) return a.toICALString() === b.toICALString();
  return a.toJSDate().getTime() === b.toJSDate().getTime();
}

function partstatFromResponse(status: Attendee["responseStatus"]): string {
  switch (status) {
    case "accepted":
      return "ACCEPTED";
    case "declined":
      return "DECLINED";
    case "tentative":
      return "TENTATIVE";
    default:
      return "NEEDS-ACTION";
  }
}

// Fold a content line at 75 octets per RFC 5545 section 3.1.
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(line);
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let offset = 0;
  while (offset < bytes.length) {
    let chunkEnd = Math.min(offset + 75, bytes.length);
    while (chunkEnd > offset && (bytes[chunkEnd]! & 0xc0) === 0x80) {
      chunkEnd -= 1;
    }
    parts.push(new TextDecoder().decode(bytes.slice(offset, chunkEnd)));
    offset = chunkEnd;
  }
  return parts.join("\r\n ");
}

// Escape text per RFC 5545 section 3.3.11.
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
