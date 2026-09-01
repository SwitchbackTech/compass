import { type AttendeeResponseStatus } from "@core/types/event-attendance.contracts";

export interface BookingOccupancyFacts {
  hostIsOrganizer?: boolean;
  hostResponseStatus?: AttendeeResponseStatus | null;
}

/**
 * Booking policy: a busy interval occupies a slot only when the host
 * organized it or accepted it. Missing facts (legacy busy intervals) occupy,
 * matching the pre-v1.1 busy-only behavior.
 */
export const occupiesBookingSlot = (facts: BookingOccupancyFacts): boolean => {
  if (
    facts.hostIsOrganizer === undefined &&
    facts.hostResponseStatus === undefined
  ) {
    return true;
  }
  return (
    facts.hostIsOrganizer === true || facts.hostResponseStatus === "accepted"
  );
};
