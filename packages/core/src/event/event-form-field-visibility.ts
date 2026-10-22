import { type EventFormFocusField } from "@core/shortcuts/event-form-focus-field";
import { type CalendarCapabilities } from "@core/types/calendar.contracts";

/** Pure inputs for whether an event-form jump target exists for the focused event. */
export type EventFormFieldVisibilityInput = {
  mode: "create" | "edit";
  isReadOnly: boolean;
  isBusyContent: boolean;
  /** Provider-managed edit: schedule and recurrence fields are blocked. */
  isScheduleLocked: boolean;
  calendarAccountEmail?: string;
  calendarCapabilities?: CalendarCapabilities;
  organizerEmail?: string | null;
  attendeeEmails?: readonly string[];
  hasConferenceLink: boolean;
  /** First conference kind the calendar can mint on create, if any. */
  creatableConferenceKind?: "meet" | "teams" | null;
  recurrenceKind?: "single" | "series" | "occurrence";
};

const canInviteOnCalendar = (
  capabilities: CalendarCapabilities | undefined,
): boolean =>
  Boolean(capabilities?.canInviteAttendees && capabilities?.canWrite);

const organizesEvent = (input: EventFormFieldVisibilityInput): boolean => {
  if (input.mode === "create") return true;
  if (!input.organizerEmail) return true;
  if (!input.calendarAccountEmail) return false;
  return (
    input.organizerEmail.toLowerCase() ===
    input.calendarAccountEmail.toLowerCase()
  );
};

const showRsvpControl = (input: EventFormFieldVisibilityInput): boolean => {
  if (input.mode !== "edit" || !input.calendarAccountEmail) return false;
  const self = input.calendarAccountEmail.toLowerCase();
  return (input.attendeeEmails ?? []).some(
    (email) => email.toLowerCase() === self,
  );
};

const writableContent = (input: EventFormFieldVisibilityInput): boolean =>
  !input.isReadOnly && !input.isBusyContent;

const scheduleEditable = (input: EventFormFieldVisibilityInput): boolean =>
  writableContent(input) && !input.isScheduleLocked;

const showRecurrenceField = (input: EventFormFieldVisibilityInput): boolean => {
  if (!scheduleEditable(input)) return false;
  if (input.mode === "create") return true;
  return input.recurrenceKind !== "single";
};

const showConferenceField = (input: EventFormFieldVisibilityInput): boolean => {
  if (input.mode === "create") {
    return writableContent(input) && Boolean(input.creatableConferenceKind);
  }
  return input.hasConferenceLink;
};

/** Whether the given field jump would land on a control that exists for this event. */
export function isEventFormFocusFieldVisible(
  field: EventFormFocusField,
  input: EventFormFieldVisibilityInput,
): boolean {
  switch (field) {
    case "title":
    case "location":
    case "description":
    case "color":
      return writableContent(input);
    case "start":
    case "end":
      return scheduleEditable(input);
    case "recurrence":
      return showRecurrenceField(input);
    case "calendar":
      return input.mode === "create";
    case "conference":
      return showConferenceField(input);
    case "attendees":
      return (
        writableContent(input) &&
        canInviteOnCalendar(input.calendarCapabilities) &&
        organizesEvent(input)
      );
    case "rsvp":
      return showRsvpControl(input);
    case "actions":
      return true;
    default: {
      const _exhaustive: never = field;
      return _exhaustive;
    }
  }
}
