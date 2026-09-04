import {
  type CalendarId,
  type DateTime,
  type EventId,
} from "@core/types/domain-primitives";
import { type BusyAvailabilityResponse } from "@core/types/sync/availability.contracts";

export const BOOKING_CONFIRMATION_MAX_AGE_MS = 5 * 60 * 1000;

export interface BookingEventGuest {
  email: string;
  displayName: string | null;
}

export interface CalendarBookingGetAvailabilityInput {
  calendarIds: readonly CalendarId[];
  start: DateTime;
  end: DateTime;
  maxAgeMs?: number;
  excludeEventIds?: readonly EventId[];
}

export interface CalendarBookingCreateEventInput {
  calendarId: CalendarId;
  title: string;
  description: string;
  start: DateTime;
  end: DateTime;
  timeZone: string;
  guest: BookingEventGuest;
  guestsCanInviteOthers: boolean;
}

export interface CalendarBookingDeleteEventInput {
  eventId: EventId;
}

export interface CalendarBookingUpdateEventInput {
  eventId: EventId;
  title: string;
  description: string;
  start: DateTime;
  end: DateTime;
  timeZone: string;
  guest: BookingEventGuest;
}

export interface CalendarBookingPort {
  getAvailability(
    userId: string,
    input: CalendarBookingGetAvailabilityInput,
  ): Promise<BusyAvailabilityResponse>;

  createBookingEvent(
    userId: string,
    input: CalendarBookingCreateEventInput,
  ): Promise<EventId>;

  updateBookingEvent(
    userId: string,
    input: CalendarBookingUpdateEventInput,
  ): Promise<void>;

  deleteBookingEvent(
    userId: string,
    input: CalendarBookingDeleteEventInput,
  ): Promise<void>;
}
