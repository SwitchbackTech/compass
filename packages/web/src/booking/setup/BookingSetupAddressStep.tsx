import { useEffect, useRef } from "react";
import { BookingAddressField } from "@web/booking/BookingAddressField";

interface BookingSetupAddressStepProps {
  bookingUrl: string | null;
  forceInvalid?: boolean;
  onChange: (slug: string) => void;
  slug: string;
}

export function BookingSetupAddressStep({
  bookingUrl,
  forceInvalid = false,
  onChange,
  slug,
}: BookingSetupAddressStepProps) {
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    document.getElementById("booking-address")?.focus();
  }, []);

  return (
    <BookingAddressField
      bookingUrl={bookingUrl}
      forceInvalid={forceInvalid}
      onChange={onChange}
      savedSlug={null}
      slug={slug}
    />
  );
}
