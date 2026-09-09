import { type RefCallback, useState } from "react";
import { BookingFieldLabel } from "@web/booking/BookingFieldLabel";
import { bookingSlugParseMessage } from "@web/booking/booking.util";
import { bookingFieldAttrs } from "@web/booking/booking-sequence.fields";

export const BOOKING_ADDRESS_CHANGE_WARNING =
  "Links using your old address will stop working.";

export function bookingAddressPrefix(bookingUrl: string | null): string {
  const origin = bookingUrl
    ? new URL(bookingUrl).origin
    : window.location.origin;
  return `${origin}/meet/`;
}

interface BookingAddressFieldProps {
  bookingUrl: string | null;
  forceInvalid?: boolean;
  inputRef?: RefCallback<HTMLInputElement | null>;
  onChange: (slug: string) => void;
  savedSlug: string | null;
  slug: string;
}

export function BookingAddressField({
  bookingUrl,
  forceInvalid = false,
  inputRef,
  onChange,
  savedSlug,
  slug,
}: BookingAddressFieldProps) {
  const [blurred, setBlurred] = useState(false);
  const prefix = bookingAddressPrefix(bookingUrl);
  const parseMessage = bookingSlugParseMessage(slug);
  const showError = (blurred || forceInvalid) && parseMessage != null;
  const showWarning = savedSlug != null && slug !== savedSlug;
  const errorId = "booking-address-error";
  const warningId = "booking-address-warning";
  const describedBy = [
    showError ? errorId : null,
    showWarning ? warningId : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="min-w-0">
      <BookingFieldLabel htmlFor="booking-address">
        Page address
      </BookingFieldLabel>
      <input
        {...bookingFieldAttrs("address")}
        aria-describedby={describedBy || undefined}
        aria-invalid={showError || undefined}
        autoCapitalize="none"
        className={`c-focus-ring w-full min-w-0 rounded border bg-surface-overlay px-2 py-1 text-sm text-text ${
          showError ? "border-error" : "border-border"
        }`}
        id="booking-address"
        onBlur={() => setBlurred(true)}
        ref={inputRef}
        onChange={(event) => onChange(event.target.value.toLowerCase())}
        spellCheck={false}
        value={slug}
      />
      <p className="break-all text-text-muted text-xs">
        Your link: {prefix}
        {slug}
      </p>
      {showError ? (
        <p className="font-medium text-sm text-text" id={errorId} role="alert">
          {parseMessage}
        </p>
      ) : null}
      {showWarning ? (
        <p
          className="font-medium text-sm text-text"
          id={warningId}
          role="status"
        >
          {BOOKING_ADDRESS_CHANGE_WARNING}
        </p>
      ) : null}
    </div>
  );
}
