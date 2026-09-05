import {
  type CalendarConference,
  type CalendarProvider,
} from "@core/types/calendar.contracts";

const BOOKING_CONFERENCE_DURATION_SUFFIX: Record<CalendarConference, string> = {
  meet: " Google Meet",
  teams: " Microsoft Teams",
  none: "",
};

export const BOOKING_CONFERENCE_INVITE_COPY: Record<
  CalendarConference,
  string
> = {
  meet: "A Google Meet invite is on its way to your email.",
  teams: "A Microsoft Teams invite is on its way to your email.",
  none: "The calendar invite is on its way to your email.",
};

export const BOOKING_NO_CONFERENCE_WARNING: Record<CalendarProvider, string> = {
  local:
    "This calendar cannot create a video meeting link. Guests will get a calendar invite without a meeting URL.",
  google:
    "This calendar cannot create a Google Meet link. Guests will get a calendar invite without a Meet URL.",
  microsoft:
    "This calendar cannot create a Microsoft Teams link. Guests will get a calendar invite without a Teams URL.",
  apple:
    "This calendar cannot create a video meeting link. Guests will get a calendar invite without a meeting URL.",
};

export function formatBookingDurationWithConference(
  durationLabel: string,
  conference: CalendarConference,
): string {
  return `${durationLabel}${BOOKING_CONFERENCE_DURATION_SUFFIX[conference]}`;
}

export function resolveBookingConference(
  conference?: CalendarConference,
  createsGoogleMeet?: boolean,
): CalendarConference {
  if (conference !== undefined) {
    return conference;
  }
  return createsGoogleMeet === false ? "none" : "meet";
}
