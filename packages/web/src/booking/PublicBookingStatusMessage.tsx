import { type Ref } from "react";
import { PublicBookingLayout } from "@web/booking/PublicBookingLayout";

interface PublicBookingStatusMessageProps {
  title: string;
  description: string;
  headingRef?: Ref<HTMLHeadingElement>;
}

export function PublicBookingStatusMessage({
  title,
  description,
  headingRef,
}: PublicBookingStatusMessageProps) {
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
