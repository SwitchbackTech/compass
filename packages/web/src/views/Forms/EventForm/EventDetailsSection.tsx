import { MapPinIcon, UsersIcon, VideoCameraIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { type EventContent } from "@core/types/event.contracts";
import { type AttendeeResponseStatus } from "@core/types/event-attendance.contracts";

type EventDetails = Extract<EventContent, { kind: "details" }>;

interface EventDetailsSectionProps {
  details: Pick<
    EventDetails,
    "location" | "organizer" | "attendees" | "conference"
  >;
}

const ATTENDEE_STATUS_DOT: Record<AttendeeResponseStatus, string> = {
  accepted: "bg-success",
  declined: "bg-error",
  tentative: "bg-warning",
  needsAction: "bg-text-subtle",
};

const attendeeStatusLabel = (status: AttendeeResponseStatus): string =>
  status === "needsAction" ? "hasn't responded" : status;

const mapsUrlForLocation = (location: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

const MAX_VISIBLE_ATTENDEES = 6;

/**
 * Read-only display for provider-sourced event fields Compass doesn't let
 * the user edit: the Google Meet link, location (linked out to Maps), and
 * the attendee list with RSVP status. Rendered only when the event has at
 * least one of these - absent for a plain Compass-native event and for a
 * busy-projection event (whose content carries none of this).
 */
export const EventDetailsSection = ({ details }: EventDetailsSectionProps) => {
  const { location, organizer, attendees = [], conference } = details;
  const [showAllAttendees, setShowAllAttendees] = useState(false);
  const hasAttendees = attendees.length > 0;

  if (!location && !conference && !hasAttendees) return null;

  const visibleAttendees = showAllAttendees
    ? attendees
    : attendees.slice(0, MAX_VISIBLE_ATTENDEES);
  const hiddenAttendeeCount = attendees.length - visibleAttendees.length;

  return (
    <div className="flex flex-col gap-2 rounded-md bg-surface-overlay p-3 text-text text-xs">
      {conference && (
        <a
          href={conference.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:underline"
        >
          <VideoCameraIcon size={16} className="shrink-0 text-text-muted" />
          <span className="min-w-0 flex-1 truncate">
            {conference.label ?? "Join meeting"}
          </span>
        </a>
      )}

      {location && (
        <a
          href={mapsUrlForLocation(location)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:underline"
        >
          <MapPinIcon size={16} className="shrink-0 text-text-muted" />
          <span className="min-w-0 flex-1 truncate">{location}</span>
        </a>
      )}

      {hasAttendees && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-text-muted">
            <UsersIcon size={16} className="shrink-0" />
            <span>
              {attendees.length} {attendees.length === 1 ? "guest" : "guests"}
            </span>
          </div>
          <ul className="flex flex-col gap-1 pl-6">
            {visibleAttendees.map((attendee) => (
              <li
                key={attendee.email}
                className="flex items-center gap-2"
                title={attendeeStatusLabel(attendee.responseStatus)}
              >
                <span
                  aria-hidden
                  className={`size-2.5 shrink-0 rounded-full ${ATTENDEE_STATUS_DOT[attendee.responseStatus]}`}
                />
                <span className="min-w-0 flex-1 truncate">
                  {attendee.displayName ?? attendee.email}
                  {organizer?.email === attendee.email && " (organizer)"}
                </span>
              </li>
            ))}
          </ul>
          {hiddenAttendeeCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAllAttendees(true)}
              className="c-focus-ring self-start rounded-xs pl-6 text-left text-text-muted hover:underline"
            >
              +{hiddenAttendeeCount} more
            </button>
          )}
        </div>
      )}
    </div>
  );
};
