import { PublicBookingLayout } from "@web/booking/PublicBookingLayout";

interface PublicBookingStatusMessageProps {
  title: string;
  description: string;
}

export function PublicBookingStatusMessage({
  title,
  description,
}: PublicBookingStatusMessageProps) {
  return (
    <PublicBookingLayout>
      <section aria-labelledby="booking-status-heading">
        <h1
          id="booking-status-heading"
          className="font-semibold text-xl text-text"
        >
          {title}
        </h1>
        <p className="mt-2 text-sm text-text-muted">{description}</p>
      </section>
    </PublicBookingLayout>
  );
}
