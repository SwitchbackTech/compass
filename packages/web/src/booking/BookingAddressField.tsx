import { useState } from "react";
import { BookingSlugSchema } from "@core/types/booking.contracts";
import { BookingFieldLabel } from "@web/booking/BookingFieldLabel";
import { bookingFieldAttrs } from "@web/booking/booking-sequence.fields";

export const BOOKING_ADDRESS_HELPER =
  "3 to 32 lowercase letters, digits, or hyphens.";

export const BOOKING_ADDRESS_CHANGE_WARNING =
  "Links using your old address will stop working.";

export function bookingAddressPrefix(bookingUrl: string | null): string {
  if (bookingUrl) {
    return `${new URL(bookingUrl).origin}/book/`;
  }
  return `${window.location.origin}/book/`;
}

interface BookingAddressFieldProps {
  value: string;
  onChange: (slug: string) => void;
  bookingUrl: string | null;
  savedSlug: string | undefined;
  showShortcuts: boolean;
  highlightInvalid?: boolean;
}

export function BookingAddressField({
  value,
  onChange,
  bookingUrl,
  savedSlug,
  showShortcuts,
  highlightInvalid = false,
}: BookingAddressFieldProps) {
  const [blurred, setBlurred] = useState(false);
  const prefix = bookingAddressPrefix(bookingUrl);
  const parseResult = BookingSlugSchema.safeParse(value);
  const showInlineError = (blurred || highlightInvalid) && !parseResult.success;
  const errorMessage = !parseResult.success
    ? (parseResult.error.issues[0]?.message ?? BOOKING_ADDRESS_HELPER)
    : null;
  const errorId = "booking-address-error";
  const showWarning = savedSlug !== undefined && value !== savedSlug;

  return (
    <div>
      <BookingFieldLabel
        field="address"
        htmlFor="booking-address"
        showShortcuts={showShortcuts}
      >
        Page address
      </BookingFieldLabel>
      <div className="flex overflow-hidden rounded border border-border bg-surface-overlay text-sm text-text">
        <span className="shrink-0 border-border border-r bg-surface-panel px-2 py-1 text-text-muted">
          {prefix}
        </span>
        <input
          {...bookingFieldAttrs("address")}
          aria-describedby={showInlineError ? errorId : undefined}
          aria-invalid={showInlineError || undefined}
          autoCapitalize="none"
          className="c-focus-ring min-w-0 flex-1 bg-transparent px-2 py-1 aria-invalid:text-error"
          id="booking-address"
          onBlur={() => setBlurred(true)}
          onChange={(event) => onChange(event.target.value.toLowerCase())}
          spellCheck={false}
          value={value}
        />
      </div>
      <p className="mt-1 text-text-muted text-xs">{BOOKING_ADDRESS_HELPER}</p>
      {showInlineError && errorMessage ? (
        <p className="text-error text-xs" id={errorId} role="alert">
          {errorMessage}
        </p>
      ) : null}
      {showWarning ? (
        <p className="mt-1 text-sm text-warning" role="status">
          {BOOKING_ADDRESS_CHANGE_WARNING}
        </p>
      ) : null}
    </div>
  );
}
