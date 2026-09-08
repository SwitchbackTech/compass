import { useState } from "react";
import { BookingFieldLabel } from "@web/booking/BookingFieldLabel";
import { bookingSlugParseMessage } from "@web/booking/booking.util";
import { bookingFieldAttrs } from "@web/booking/booking-sequence.fields";

export const BOOKING_ADDRESS_HELPER =
  "3 to 32 lowercase letters, digits, or hyphens.";
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
  onChange: (slug: string) => void;
  savedSlug: string | null;
  showShortcuts: boolean;
  slug: string;
}

export function BookingAddressField({
  bookingUrl,
  forceInvalid = false,
  onChange,
  savedSlug,
  showShortcuts,
  slug,
}: BookingAddressFieldProps) {
  const [blurred, setBlurred] = useState(false);
  const prefix = bookingAddressPrefix(bookingUrl);
  const parseMessage = bookingSlugParseMessage(slug);
  const showError = (blurred || forceInvalid) && parseMessage != null;
  const showWarning = savedSlug != null && slug !== savedSlug;
  const helperId = "booking-address-helper";
  const errorId = "booking-address-error";
  const warningId = "booking-address-warning";
  const describedBy = [
    helperId,
    showError ? errorId : null,
    showWarning ? warningId : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <BookingFieldLabel
        field="address"
        htmlFor="booking-address"
        showShortcuts={showShortcuts}
      >
        Page address
      </BookingFieldLabel>
      <div
        className={`flex min-w-0 items-center rounded border bg-surface-overlay ${
          showError ? "border-error" : "border-border"
        }`}
      >
        <span className="shrink-0 pl-2 text-sm text-text-muted">{prefix}</span>
        <input
          {...bookingFieldAttrs("address")}
          aria-describedby={describedBy}
          aria-invalid={showError || undefined}
          autoCapitalize="none"
          className="c-focus-ring min-w-0 flex-1 rounded border-0 bg-transparent px-1 py-1 text-sm text-text"
          id="booking-address"
          onBlur={() => setBlurred(true)}
          onChange={(event) => onChange(event.target.value.toLowerCase())}
          spellCheck={false}
          value={slug}
        />
      </div>
      <p className="text-text-muted text-xs" id={helperId}>
        {BOOKING_ADDRESS_HELPER}
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
