import { type ObjectId } from "mongodb";
import {
  type CalendarConference,
  conferenceForDestination,
} from "@core/types/calendar.contracts";
import { bookingPageRepository } from "@backend/booking/booking-page.repository";
import { bookingReservationRepository } from "@backend/booking/booking-reservation.repository";
import calendarService from "@backend/calendar/services/calendar.service";
import { CONFIG } from "@backend/common/constants/config.constants";
import mongoService from "@backend/common/services/mongo.service";
import { toSyncPrincipal } from "@backend/common/services/sync-service/sync-principal";
import { getSyncServiceClient } from "@backend/common/services/sync-service/sync-service.factory";
import { durationMinutesForHostEmail } from "@backend/email/booking-host-email.content";
import { weekDateKeyForInstant } from "@backend/email/booking-host-email.format";

export type BookingHostEmailDispatchContext = {
  user: {
    email: string;
    firstName: string;
    isSynthetic?: boolean;
    emailPreferences?: {
      unsubscribedAt?: Date;
      suppressedAt?: Date;
      bookingHostEmailDisabledAt?: Date;
    };
  };
  reservation: Awaited<
    ReturnType<typeof bookingReservationRepository.findById>
  >;
  page: Awaited<ReturnType<typeof bookingPageRepository.findById>>;
  durationMinutes: number;
  conference: CalendarConference;
  openInCompassUrl: string;
};

async function resolveDestinationConference(
  userId: ObjectId,
  destinationCalendarId: string,
): Promise<CalendarConference> {
  const local = await calendarService.getLocalCalendar(userId);
  if (local && local._id.toHexString() === destinationCalendarId) {
    return "none";
  }

  const client = getSyncServiceClient();
  const principal = toSyncPrincipal(userId.toString());
  const calendarsResult = await client.listCalendars(principal);
  if (!calendarsResult.ok) {
    return "meet";
  }
  const destination = calendarsResult.value.calendars.find(
    (calendar) => (calendar.id as string) === destinationCalendarId,
  );
  if (!destination) {
    return "none";
  }

  const connectionsResult = await client.listConnections(principal);
  const connection = connectionsResult.ok
    ? connectionsResult.value.connections.find(
        (candidate) => candidate.id === destination.connectionId,
      )
    : undefined;
  return conferenceForDestination(
    connection?.provider ?? "google",
    destination.createsGoogleMeet !== false,
    connection?.capabilities,
  );
}

export async function loadBookingHostEmailDispatchContext(input: {
  userId: ObjectId;
  reservationId: ObjectId;
}): Promise<BookingHostEmailDispatchContext | null> {
  const user = await mongoService.user.findOne(
    { _id: input.userId },
    {
      projection: {
        email: 1,
        firstName: 1,
        isSynthetic: 1,
        emailPreferences: 1,
      },
    },
  );
  if (!user?.email?.trim()) {
    return null;
  }

  const reservation = await bookingReservationRepository.findById(
    input.reservationId,
  );
  if (!reservation) {
    return null;
  }

  const page = await bookingPageRepository.findById(reservation.pageId);
  if (!page?.enabled) {
    return null;
  }

  const conference = await resolveDestinationConference(
    page.userId,
    page.destinationCalendarId,
  );
  const weekKey = weekDateKeyForInstant(reservation.slotStart, page.timeZone);
  const openInCompassUrl = `${CONFIG.FRONTEND_URL.replace(/\/$/, "")}/week/${weekKey}`;

  return {
    user: {
      email: user.email,
      firstName: user.firstName,
      isSynthetic: user.isSynthetic,
      emailPreferences: user.emailPreferences,
    },
    reservation,
    page,
    durationMinutes: durationMinutesForHostEmail(
      reservation,
      page.durationMinutes,
    ),
    conference,
    openInCompassUrl,
  };
}
