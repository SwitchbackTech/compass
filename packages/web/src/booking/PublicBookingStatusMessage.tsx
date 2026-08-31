import { PublicBookingLayout } from "@web/booking/PublicBookingLayout";
import { useBookingHeadingFocus } from "@web/booking/use-booking-heading-focus";

interface PublicBookingStatusMessageProps {
  title: string;
  description: string;
}

export function PublicBookingStatusMessage({
  title,
  description,
}: PublicBookingStatusMessageProps) {
  const headingRef = useBookingHeadingFocus(title);

  return (
    <PublicBookingLayout>
      <section aria-labelledby="booking-status-heading">
        <h1
          ref={headingRef}
          id="booking-status-heading"
          tabIndex={-1}
          className="font-semibold text-text text-xl focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {title}
        </h1>
        <p className="mt-2 text-sm text-text-muted">{description}</p>
      </section>
    </PublicBookingLayout>
  );
}
