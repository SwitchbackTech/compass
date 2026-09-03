import { useParams } from "@tanstack/react-router";
import { PublicBookingNotFoundError } from "@web/api/public-booking.api";
import { PublicBookingDetailsStep } from "@web/booking/PublicBookingDetailsStep";
import { PublicBookingGuestForm } from "@web/booking/PublicBookingGuestForm";
import { PublicBookingLayout } from "@web/booking/PublicBookingLayout";
import { PublicBookingPicker } from "@web/booking/PublicBookingPicker";
import { PublicBookingSkipLink } from "@web/booking/PublicBookingSkipLink";
import {
  PUBLIC_BOOKING_HEADING_CLASS,
  PublicBookingStatusMessage,
} from "@web/booking/PublicBookingStatusMessage";
import { PublicBookingTimezoneControl } from "@web/booking/PublicBookingTimezoneControl";
import { formatDurationMinutes } from "@web/booking/public-booking.format";
import { useBookingDocumentTitle } from "@web/booking/use-booking-document-title";
import { useBookingHeadingFocus } from "@web/booking/use-booking-heading-focus";
import { usePublicBookingFlow } from "@web/booking/use-public-booking-flow";

const STICKY_STEP_CLASS_NAME =
  "sticky bottom-0 z-10 -mx-4 border-border border-t bg-background px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:px-0 sm:py-0";

export function PublicBookingPage() {
  const { username } = useParams({ from: "/book/$username" });
  const flow = usePublicBookingFlow();
  const { pageQuery, slotsQuery } = flow;
  const headingRef = useBookingHeadingFocus(
    pageQuery.isSuccess && pageQuery.data?.enabled ? username : null,
  );

  useBookingDocumentTitle(
    pageQuery.data?.enabled
      ? `Book with ${pageQuery.data.hostDisplayName}`
      : null,
  );

  if (pageQuery.isLoading) {
    return (
      <PublicBookingStatusMessage
        title="Loading booking page"
        description="One moment while we load available times."
      />
    );
  }

  if (
    pageQuery.error instanceof PublicBookingNotFoundError ||
    (pageQuery.isSuccess && !pageQuery.data.enabled)
  ) {
    return (
      <PublicBookingStatusMessage
        title="Booking page not found"
        description="This link may be incorrect or the host has turned booking off."
      />
    );
  }

  if (pageQuery.isError || !pageQuery.isSuccess || !pageQuery.data) {
    return (
      <PublicBookingStatusMessage
        title="Could not load booking page"
        description="Please refresh and try again."
      />
    );
  }

  const page = pageQuery.data;

  if (slotsQuery.data && !slotsQuery.data.bookable) {
    return (
      <PublicBookingStatusMessage
        title="Booking temporarily unavailable"
        description="The host calendar is not ready for new bookings. Please try again later."
      />
    );
  }

  return (
    <PublicBookingLayout wide>
      <PublicBookingSkipLink
        href={
          flow.showDetailsStep
            ? "#booking-form-heading"
            : "#booking-slots-heading"
        }
        label={
          flow.showDetailsStep ? "Skip to your details" : "Skip to open times"
        }
      />
      <header className="flex flex-col gap-1">
        <h1
          className={PUBLIC_BOOKING_HEADING_CLASS}
          ref={headingRef}
          tabIndex={-1}
        >
          Book with {page.hostDisplayName}
        </h1>
        <p className="text-sm text-text-muted">
          {formatDurationMinutes(page.durationMinutes)} Google Meet
        </p>
        {page.welcomeText ? (
          <p className="text-sm text-text">{page.welcomeText}</p>
        ) : null}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-text-muted">
          <p>Times shown in your timezone</p>
          <PublicBookingTimezoneControl
            timeZone={flow.guestTimeZone}
            onChange={flow.handleTimeZoneChange}
          />
        </div>
      </header>

      {flow.alertMessage ? (
        <p
          ref={flow.alertRef}
          role="alert"
          tabIndex={-1}
          className="rounded-md border border-warning/40 bg-surface-panel px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {flow.alertMessage}
        </p>
      ) : null}

      {flow.showDetailsStep && flow.selectedSlotStart ? (
        <div className={STICKY_STEP_CLASS_NAME}>
          <PublicBookingDetailsStep
            headingRef={flow.detailsHeadingRef}
            slotStart={flow.selectedSlotStart}
            durationMinutes={page.durationMinutes}
            timeZone={flow.guestTimeZone}
            disabled={flow.createReservation.isPending}
            values={flow.guestDetails}
            onChange={flow.setGuestDetails}
            onSubmit={flow.handleSubmit}
            onChangeTime={flow.handleChangeTime}
          />
        </div>
      ) : (
        <>
          <PublicBookingPicker
            monthKey={flow.monthKey}
            timeZone={flow.guestTimeZone}
            maxHorizonDays={page.maxHorizonDays}
            slots={slotsQuery.data?.slots ?? []}
            slotsPending={flow.slotsPending}
            slotsError={flow.slotsError}
            slotsFetching={flow.slotsFetching}
            selectedDateKey={flow.selectedDateKey}
            selectedSlotStart={flow.selectedSlotStart}
            slotsHeadingRef={flow.pickerHeadingRef}
            onMonthChange={flow.handleMonthChange}
            onPrefetchMonth={flow.handlePrefetchMonth}
            onSelectDate={flow.handleSelectDay}
            onSelectSlot={flow.handleSelectSlot}
            onJumpToNextAvailable={() => {
              void flow.handleJumpToNextAvailable();
            }}
            onRetrySlots={() => {
              void slotsQuery.refetch();
            }}
          />

          {flow.showConflictForm ? (
            <div className={STICKY_STEP_CLASS_NAME}>
              <PublicBookingGuestForm
                disabled={flow.createReservation.isPending}
                submitDisabled={!flow.selectedSlotStart}
                guestTimeZone={flow.guestTimeZone}
                values={flow.guestDetails}
                onChange={flow.setGuestDetails}
                onSubmit={flow.handleSubmit}
              />
            </div>
          ) : flow.selectedSlotStart ? null : (
            <p className="text-sm text-text-muted">
              Select a time to continue.
            </p>
          )}
        </>
      )}
    </PublicBookingLayout>
  );
}
