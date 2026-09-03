import { type AttendeeInput } from "@core/types/event-attendance.contracts";
import dayjs from "@core/util/date/dayjs";
import { getTimesLabel } from "@web/common/utils/datetime/web.date.util";
import { htmlToPlainText } from "@web/common/utils/html/html-to-plain-text.util";
import { type GridScheduleDraft } from "@web/events/event-draft.types";

const formatAttendeeLine = (attendee: AttendeeInput) =>
  attendee.displayName
    ? `${attendee.displayName} <${attendee.email}>`
    : attendee.email;

const formatScheduleLine = (schedule: GridScheduleDraft): string => {
  const start = dayjs(schedule.start);
  const end = dayjs(schedule.end);

  if (schedule.kind === "allDay") {
    const endInclusive = end.subtract(1, "day");
    const sameDay = start.isSame(endInclusive, "day");
    if (sameDay) {
      return `All day, ${start.format("dddd, MMMM D, YYYY")}`;
    }
    return `All day, ${start.format("MMM D, YYYY")} - ${endInclusive.format("MMM D, YYYY")}`;
  }

  const sameDay = start.isSame(end, "day");
  const dateLabel = start.format("dddd, MMMM D, YYYY");
  const timeLabel = getTimesLabel(start.format(), end.format());
  return sameDay ? `${dateLabel}, ${timeLabel}` : `${dateLabel}, ${timeLabel}`;
};

export interface FormatEventPlainTextInput {
  title: string;
  schedule: GridScheduleDraft;
  location: string;
  description: string;
  attendees?: readonly AttendeeInput[];
  calendarName?: string | null;
}

/**
 * Formats the sidebar event form as plain text suitable for email or notes.
 */
export function formatEventPlainText({
  title,
  schedule,
  location,
  description,
  attendees,
  calendarName,
}: FormatEventPlainTextInput): string {
  const lines: string[] = [];
  lines.push(title.trim() || "Untitled event");
  lines.push(formatScheduleLine(schedule));

  if (calendarName) {
    lines.push(`Calendar: ${calendarName}`);
  }

  if (location.trim()) {
    lines.push(`Location: ${location.trim()}`);
  }

  if (attendees && attendees.length > 0) {
    lines.push("Attendees:");
    for (const attendee of attendees) {
      lines.push(`- ${formatAttendeeLine(attendee)}`);
    }
  }

  const descriptionText = htmlToPlainText(description);
  if (descriptionText) {
    lines.push("");
    lines.push(descriptionText);
  }

  return lines.join("\n");
}

export function formatAttendeeListPlainText(
  attendees: readonly AttendeeInput[],
): string {
  if (attendees.length === 0) return "";
  return attendees.map(formatAttendeeLine).join("\n");
}
