import {
  type CalendarId,
  type EventId,
  type Priority,
} from "@core/types/domain-primitives";
import { type RecurrenceScope } from "@core/types/event-command.contracts";

// Drafts use required keys with nullable incomplete values. This confines
// form checks to one place without recreating the optional-property problem.
export type EventScheduleDraft =
  | {
      kind: "timed";
      start: Date | null;
      end: Date | null;
      timeZone: string | null;
    }
  | {
      kind: "allDay";
      start: Date | null;
      end: Date | null;
    }
  | {
      kind: "someday";
      period: "week" | "month";
      anchorDate: Date | null;
      sortOrder: number | null;
    };

export type NewEventRecurrenceDraft =
  | { kind: "single" }
  | { kind: "series"; rules: string[] };

export type EditEventRecurrenceDraft =
  | { kind: "preserve" }
  | NewEventRecurrenceDraft;

type SharedEventFormValues = {
  title: string;
  description: string;
  schedule: EventScheduleDraft;
  priority: Priority | null;
};

// A new draft can only use "single" or "series" and has no irrelevant
// recurrence scope.
export type NewEventFormValues = SharedEventFormValues & {
  calendarId: CalendarId | null;
  recurrence: NewEventRecurrenceDraft;
};

// An edit starts with "preserve", so the backend retains the stored
// single/series/occurrence identity unless the user explicitly changes
// recurrence. The client never submits a seriesId.
export type EditEventFormValues = SharedEventFormValues & {
  calendarId: CalendarId;
  recurrence: EditEventRecurrenceDraft;
  scope: RecurrenceScope;
};

export type EventFormValues = NewEventFormValues | EditEventFormValues;

type DraftState<TValues extends EventFormValues> = {
  values: TValues;
  isDirty: boolean;
  submitError: string | null;
};

export type NewEventDraft = DraftState<NewEventFormValues> & {
  mode: "create";
};

// originalCalendarId is displayed but never included in ReplaceEventInput,
// so an edit cannot move an existing event between calendars.
export type EditEventDraft = DraftState<EditEventFormValues> & {
  mode: "edit";
  eventId: EventId;
  originalCalendarId: CalendarId;
};

export type EventDraft = NewEventDraft | EditEventDraft;
