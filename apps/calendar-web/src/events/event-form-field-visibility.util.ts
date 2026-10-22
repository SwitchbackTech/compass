import {
  type EventFormFieldVisibilityInput,
  isEventFormFocusFieldVisible,
} from "@core/event/event-form-field-visibility";
import {
  type EDIT_SEQUENCE_FIELDS,
  EDIT_SEQUENCE_LETTER_FIELDS,
  FORM_FIELD_DIGITS,
} from "@core/shortcuts/edit-sequence.fields";
import { type EventFormFocusField } from "@core/shortcuts/event-form-focus-field";
import { type Calendar } from "@core/types/calendar.contracts";
import { type CalendarId } from "@core/types/domain-primitives";
import { type Event } from "@core/types/event.contracts";
import { creatableConferenceKind } from "@web/calendars/calendar.util";
import { isEventReadOnly } from "@web/calendars/useCalendarLookup";
import { type GridEvent } from "@web/common/types/web.event.types";
import { type GridEventDraft } from "@web/events/event-draft.types";

const recurrenceKindFromEvent = (
  event: Event,
): EventFormFieldVisibilityInput["recurrenceKind"] => {
  if (event.recurrence.kind === "series") return "series";
  if (event.recurrence.kind === "occurrence") return "occurrence";
  return "single";
};

const detailsFromEvent = (event: Event) =>
  event.content.kind === "details" ? event.content : null;

const peopleFromDetails = (
  details: ReturnType<typeof detailsFromEvent>,
): Pick<
  EventFormFieldVisibilityInput,
  "organizerEmail" | "attendeeEmails" | "hasConferenceLink"
> => ({
  organizerEmail: details?.organizer?.email ?? null,
  attendeeEmails: details?.attendees?.map((attendee) => attendee.email) ?? [],
  hasConferenceLink: Boolean(details?.conference?.url),
});

const calendarFields = (
  calendar: Calendar | undefined,
): Pick<
  EventFormFieldVisibilityInput,
  "calendarAccountEmail" | "calendarCapabilities"
> => ({
  calendarAccountEmail: calendar?.accountEmail,
  calendarCapabilities: calendar?.capabilities,
});

/** Calendar the draft would write to: selected on create, source on edit. */
export function calendarFromDraft(
  draft: GridEventDraft,
  calendarLookup: ReadonlyMap<CalendarId, Calendar>,
  defaultTargetCalendar?: Calendar,
): Calendar | undefined {
  if (draft.kind === "create") {
    return draft.values.calendarId
      ? calendarLookup.get(draft.values.calendarId)
      : defaultTargetCalendar;
  }
  return calendarLookup.get(draft.source.calendarId);
}

/** Fallback when the query cache has not caught up yet (e.g. right after create). */
export function eventFormFieldVisibilityInputFromGridEvent(
  gridEvent: GridEvent,
  calendarLookup: ReadonlyMap<CalendarId, Calendar>,
): EventFormFieldVisibilityInput {
  const calendar = gridEvent.calendarId
    ? calendarLookup.get(gridEvent.calendarId)
    : undefined;
  const isBusy = gridEvent.isBusy ?? false;
  const isReadOnly = isEventReadOnly(
    calendarLookup,
    gridEvent.calendarId,
    isBusy,
  );

  return {
    mode: "edit",
    isReadOnly,
    isBusyContent: isBusy,
    isScheduleLocked: gridEvent.isProviderManaged === true,
    ...calendarFields(calendar),
    ...peopleFromDetails(null),
    creatableConferenceKind: null,
    recurrenceKind:
      gridEvent.recurrence?.rule && gridEvent.recurrence.rule.length > 0
        ? "series"
        : "single",
  };
}

export function eventFormFieldVisibilityInputFromEvent(
  event: Event,
  calendarLookup: ReadonlyMap<CalendarId, Calendar>,
): EventFormFieldVisibilityInput {
  const calendar = calendarLookup.get(event.calendarId);
  const isBusy = event.content.kind === "busy";
  const isReadOnly = isEventReadOnly(calendarLookup, event.calendarId, isBusy);

  return {
    mode: "edit",
    isReadOnly,
    isBusyContent: isBusy,
    isScheduleLocked: event.providerManaged === true,
    ...calendarFields(calendar),
    ...peopleFromDetails(detailsFromEvent(event)),
    creatableConferenceKind: null,
    recurrenceKind: recurrenceKindFromEvent(event),
  };
}

export function eventFormFieldVisibilityInputFromDraft(
  draft: GridEventDraft,
  calendarLookup: ReadonlyMap<CalendarId, Calendar>,
  defaultTargetCalendar?: Calendar,
): EventFormFieldVisibilityInput {
  const source = draft.kind === "edit" ? draft.source : null;
  const isBusy = source?.content.kind === "busy";
  const calendar = calendarFromDraft(
    draft,
    calendarLookup,
    defaultTargetCalendar,
  );
  const isReadOnly =
    draft.kind === "edit" &&
    isEventReadOnly(calendarLookup, source!.calendarId, isBusy);

  return {
    mode: draft.kind,
    isReadOnly,
    isBusyContent: isBusy,
    isScheduleLocked: source?.providerManaged === true,
    ...calendarFields(calendar),
    ...peopleFromDetails(source ? detailsFromEvent(source) : null),
    creatableConferenceKind:
      draft.kind === "create" && !isReadOnly
        ? creatableConferenceKind(calendar)
        : null,
    recurrenceKind:
      source === null ? "single" : recurrenceKindFromEvent(source),
  };
}

type EditSequenceLetterField = (typeof EDIT_SEQUENCE_LETTER_FIELDS)[number];

export function visibleEditSequenceLetterFields(
  input: EventFormFieldVisibilityInput,
): EditSequenceLetterField[] {
  return EDIT_SEQUENCE_LETTER_FIELDS.filter((row) =>
    isEventFormFocusFieldVisible(row.field, input),
  );
}

export function visibleFormFieldDigitRows(
  input: EventFormFieldVisibilityInput,
): (typeof EDIT_SEQUENCE_FIELDS)[number][] {
  return FORM_FIELD_DIGITS.filter((row) =>
    isEventFormFocusFieldVisible(row.field, input),
  );
}

export function editSequenceFieldByKey(
  input: EventFormFieldVisibilityInput,
): Record<string, EventFormFocusField> {
  return Object.fromEntries(
    visibleEditSequenceLetterFields(input).map((row) => [row.key, row.field]),
  ) as Record<string, EventFormFocusField>;
}
