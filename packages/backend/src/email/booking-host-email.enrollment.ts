import { captureSafely } from "@core/logger/posthog-capture";
import { Logger } from "@core/logger/winston.logger";
import { type BookingPageRecord } from "@backend/booking/booking-page.record";
import { type BookingReservationRecord } from "@backend/booking/booking-reservation.record";
import { CONFIG } from "@backend/common/constants/config.constants";
import { getBackendPostHogClient } from "@backend/common/helpers/backend-posthog-client";
import {
  type BookingHostEmailKind,
  buildBookingHostEmailLedgerId,
} from "@backend/email/booking-host-email.id";
import { emailSendRepository } from "@backend/email/email-send.repository";
import { isWelcomeEmailEnabled } from "@backend/email/welcome-sequence.enrollment";

const logger = Logger("app:email.booking-host");

export function isBookingHostEmailEnabled(): boolean {
  return isWelcomeEmailEnabled() && CONFIG.BOOKING_HOST_EMAIL_ENABLED !== false;
}

export async function enqueueBookingHostEmail(
  page: BookingPageRecord,
  reservation: BookingReservationRecord,
): Promise<void> {
  if (!isBookingHostEmailEnabled()) {
    return;
  }

  const kind = reservation.lastGuestAction;
  const lastGuestActionAt = reservation.lastGuestActionAt;
  if (
    !kind ||
    !lastGuestActionAt ||
    (kind !== "booked" && kind !== "cancelled" && kind !== "rescheduled")
  ) {
    return;
  }

  const typedKind = kind as BookingHostEmailKind;
  const now = new Date();
  const rowId = buildBookingHostEmailLedgerId({
    reservationId: reservation._id.toHexString(),
    lastGuestActionAt,
    kind: typedKind,
  });

  try {
    await emailSendRepository.insertMany([
      {
        _id: rowId,
        userId: page.userId,
        sequence: "booking-host",
        stepKey: typedKind,
        reservationId: reservation._id,
        status: "queued",
        sendAt: now,
        nextAttemptAt: now,
      },
    ]);
  } catch (error) {
    logger.error("Failed to enqueue booking host email", {
      rowId,
      reservationId: reservation._id.toHexString(),
      kind: typedKind,
      message: error instanceof Error ? error.message : String(error),
    });
    void captureSafely(getBackendPostHogClient(), {
      event: "booking_host_email_enqueue_failed",
      distinctId: page.userId.toHexString(),
      properties: {
        environment: CONFIG.NODE_ENV,
        kind: typedKind,
        reservation_id: reservation._id.toHexString(),
      },
    });
  }
}
